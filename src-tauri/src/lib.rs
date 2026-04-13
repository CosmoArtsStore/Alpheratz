use regex::Regex;
use serde::Deserialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;
use tauri::{generate_handler, AppHandle, Builder, State};
use tauri_plugin_opener::OpenerExt;

use orientation::{OrientationProgressPayload, OrientationWorkerState};
use similar_photo_match::{PHashProgressPayload, PHashWorkerState};

/// Shared cancel flag used by the folder scan worker.
pub struct ScanCancelStatus(pub AtomicBool);

pub mod config;
pub mod db;
pub mod models;
pub mod orientation;
mod pdq_hash;
pub mod scanner;
pub mod similar_photo_match;
pub mod utils;

use config::{load_setting, save_setting, AlpheratzSetting};
use db::init_alpheratz_db;
use models::{DisplayPhotoItemRecord, PhotoQuery, PhotoRecord};

/// Builds the regex used to validate `VRChat` world ids before opening URLs.
fn compile_world_id_regex() -> Regex {
    match Regex::new(r"^wrld_[A-Za-z0-9_-]+$") {
        Ok(regex) => regex,
        Err(err) => {
            utils::log_err(&format!("ワールドID正規表現の初期化に失敗しました: {err}"));
            std::process::abort();
        }
    }
}

static WORLD_ID_RE: LazyLock<Regex> = LazyLock::new(compile_world_id_regex);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PhotoBatchEntry {
    photo_path: String,
    source_slot: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PhotoGroupingRequest {
    photos: Vec<PhotoRecord>,
    grouping_mode: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SimilarGroupRequest {
    photos: Vec<PhotoRecord>,
    anchor_photo_path: String,
    limit: Option<usize>,
}

/// Parses stored pHash variants from the pipe-separated database representation.
fn parse_hash_variants(value: Option<&str>) -> Vec<String> {
    value
        .unwrap_or_default()
        .split('|')
        .map(|item| item.trim().to_ascii_lowercase())
        .filter(|item| item.len() == 64 && item.chars().all(|ch| ch.is_ascii_hexdigit()))
        .collect()
}

/// Computes the nibble-wise Hamming distance between two hexadecimal hashes.
fn get_hamming_distance(left: &str, right: &str) -> Option<u32> {
    if left.len() != right.len() {
        return None;
    }

    let mut distance = 0;
    for (left_digit, right_digit) in left.chars().zip(right.chars()) {
        let left_value = left_digit.to_digit(16)?;
        let right_value = right_digit.to_digit(16)?;
        distance += (left_value ^ right_value).count_ones();
    }
    Some(distance)
}

/// Returns the closest Hamming distance across all hash-variant combinations.
fn get_closest_hash_distance(left: &[String], right: &[String]) -> Option<u32> {
    if left.is_empty() || right.is_empty() {
        return None;
    }

    let mut best = u32::MAX;
    for left_hash in left {
        for right_hash in right {
            let Some(distance) = get_hamming_distance(left_hash, right_hash) else {
                continue;
            };
            if distance < best {
                best = distance;
            }
            if best == 0 {
                return Some(0);
            }
        }
    }

    (best != u32::MAX).then_some(best)
}

/// Normalizes world names for loose grouping comparisons.
fn normalize_world_name(value: Option<&str>) -> String {
    value.unwrap_or_default().trim().to_lowercase()
}

/// Checks whether two photos are compatible enough to compare as similar neighbors.
fn can_group_by_photo_meta(left: &PhotoRecord, right: &PhotoRecord) -> bool {
    let left_world = normalize_world_name(left.world_name.as_deref());
    let right_world = normalize_world_name(right.world_name.as_deref());
    if !left_world.is_empty() && !right_world.is_empty() && left_world != right_world {
        return false;
    }

    let left_orientation = left.orientation.as_deref().unwrap_or("unknown");
    let right_orientation = right.orientation.as_deref().unwrap_or("unknown");
    if left_orientation != "unknown"
        && right_orientation != "unknown"
        && left_orientation != right_orientation
    {
        return false;
    }

    left.source_slot == right.source_slot
}

/// Determines whether two adjacent photos should belong to the same similarity group.
fn are_adjacent_photos_similar(left: &PhotoRecord, right: &PhotoRecord) -> bool {
    if !can_group_by_photo_meta(left, right) {
        return false;
    }

    let left_hashes = parse_hash_variants(left.phash.as_deref());
    let right_hashes = parse_hash_variants(right.phash.as_deref());
    matches!(get_closest_hash_distance(&left_hashes, &right_hashes), Some(distance) if distance <= 124)
}

/// Builds adjacent similarity groups from an ordered photo list.
fn build_adjacent_similar_photo_groups(photos: &[PhotoRecord]) -> Vec<Vec<PhotoRecord>> {
    let mut groups = Vec::new();
    let mut current_group: Vec<PhotoRecord> = Vec::new();

    for current_photo in photos {
        if current_group.is_empty() {
            current_group.push(current_photo.clone());
            continue;
        }

        let Some(previous_photo) = current_group.last() else {
            current_group.push(current_photo.clone());
            continue;
        };
        let Some(anchor_photo) = current_group.first() else {
            current_group.push(current_photo.clone());
            continue;
        };

        if are_adjacent_photos_similar(previous_photo, current_photo)
            && are_adjacent_photos_similar(anchor_photo, current_photo)
        {
            current_group.push(current_photo.clone());
            continue;
        }

        groups.push(current_group);
        current_group = vec![current_photo.clone()];
    }

    if !current_group.is_empty() {
        groups.push(current_group);
    }

    groups
}

/// Builds the similarity group surrounding a chosen anchor photo.
fn build_adjacent_similar_photo_group(
    photos: &[PhotoRecord],
    anchor_photo_path: &str,
) -> Vec<PhotoRecord> {
    let Some(anchor_index) = photos
        .iter()
        .position(|photo| photo.photo_path == anchor_photo_path)
    else {
        return Vec::new();
    };

    let anchor_photo = &photos[anchor_index];
    let mut start = anchor_index;
    while start > 0 {
        let previous_photo = &photos[start - 1];
        let current_photo = &photos[start];
        if !are_adjacent_photos_similar(previous_photo, current_photo)
            || !are_adjacent_photos_similar(previous_photo, anchor_photo)
        {
            break;
        }
        start -= 1;
    }

    let mut end = anchor_index;
    while end + 1 < photos.len() {
        let current_photo = &photos[end];
        let next_photo = &photos[end + 1];
        if !are_adjacent_photos_similar(current_photo, next_photo)
            || !are_adjacent_photos_similar(next_photo, anchor_photo)
        {
            break;
        }
        end += 1;
    }

    photos[start..=end].to_vec()
}

/// Groups photos by resolved world name for the world-grouping mode.
fn build_world_grouped_photo_items(photos: &[PhotoRecord]) -> Vec<DisplayPhotoItemRecord> {
    let mut groups = std::collections::BTreeMap::<String, Vec<PhotoRecord>>::new();
    for photo in photos {
        let key = photo
            .world_name
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("ワールド不明")
            .to_string();
        groups.entry(key).or_default().push(photo.clone());
    }

    let mut entries: Vec<_> = groups.into_iter().collect();
    entries.sort_by(|(left_world, left_group), (right_world, right_group)| {
        let world_compare = left_world.cmp(right_world);
        if world_compare != std::cmp::Ordering::Equal {
            return world_compare;
        }
        let left_timestamp = left_group
            .first()
            .map(|photo| photo.timestamp.as_str())
            .unwrap_or_default();
        let right_timestamp = right_group
            .first()
            .map(|photo| photo.timestamp.as_str())
            .unwrap_or_default();
        right_timestamp.cmp(left_timestamp)
    });

    entries
        .into_iter()
        .map(|(_, mut group)| {
            group.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
            DisplayPhotoItemRecord {
                photo: group.first().cloned().unwrap_or_default(),
                group_count: Some(group.len()),
                group_photos: Some(group),
            }
        })
        .collect()
}

/// Builds display items for the requested grouping mode.
fn build_display_photo_items(
    photos: &[PhotoRecord],
    grouping_mode: &str,
) -> Vec<DisplayPhotoItemRecord> {
    match grouping_mode {
        "world" => build_world_grouped_photo_items(photos),
        "similar" => build_adjacent_similar_photo_groups(photos)
            .into_iter()
            .map(|group| DisplayPhotoItemRecord {
                photo: group.first().cloned().unwrap_or_default(),
                group_count: Some(group.len()),
                group_photos: Some(group),
            })
            .collect(),
        _ => photos
            .iter()
            .cloned()
            .map(|photo| DisplayPhotoItemRecord {
                photo,
                group_count: None,
                group_photos: None,
            })
            .collect(),
    }
}

/// Expands a tweet template into the final tweet text for a photo.
fn build_tweet_text(photo: &PhotoRecord, template: &str) -> String {
    let world = photo
        .world_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("ワールド不明");
    let date = if photo.timestamp.len() >= 16 {
        photo.timestamp[..16].replace('T', " ")
    } else {
        String::new()
    };
    let memo = photo.memo.trim().to_string();
    let tags = photo
        .tags
        .iter()
        .map(|tag| format!("#{}", tag.split_whitespace().collect::<String>()))
        .collect::<Vec<_>>()
        .join(" ");

    [
        ("{world}", world.to_string()),
        ("{world-name}", world.to_string()),
        ("{date}", date),
        ("{file}", photo.photo_filename.clone()),
        ("{memo}", memo),
        ("{tags}", tags),
    ]
    .into_iter()
    .fold(template.to_string(), |current_text, (token, value)| {
        current_text.replace(token, &value)
    })
    .lines()
    .enumerate()
    .filter_map(|(index, line)| {
        let trimmed = line.trim_end();
        if !trimmed.is_empty() || index > 0 {
            Some(trimmed.to_string())
        } else {
            None
        }
    })
    .collect::<Vec<_>>()
    .join("\n")
    .trim()
    .to_string()
}

// --- Commands ---

/// Requests cancellation of the running folder scan.
#[tauri::command]
async fn cancel_scan(cancel_status: State<'_, ScanCancelStatus>) -> Result<(), String> {
    cancel_status.0.store(true, Ordering::SeqCst);
    Ok(())
}

/// Starts the folder scan and schedules pHash generation after success.
#[tauri::command]
async fn initialize_scan(
    app: AppHandle,
    cancel_status: State<'_, ScanCancelStatus>,
) -> Result<(), String> {
    cancel_status.0.store(false, Ordering::SeqCst);
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = scanner::do_scan(app_clone.clone()) {
            crate::utils::log_err(&format!("スキャンに失敗しました: {err}"));
        } else {
            similar_photo_match::start_phash_worker(app_clone.clone());
        }
    });
    Ok(())
}

/// Returns photos that match the provided frontend query.
#[tauri::command]
async fn get_photos(query: PhotoQuery) -> Result<Vec<PhotoRecord>, String> {
    db::get_photos(query)
}

/// Creates a larger display thumbnail on a blocking worker thread.
#[tauri::command]
async fn create_display_thumbnail(
    path: String,
    source_slot: Option<i64>,
) -> Result<String, String> {
    let display_path = path.clone();
    let resolved_slot = source_slot.unwrap_or(1);
    tauri::async_runtime::spawn_blocking(move || {
        utils::create_display_thumbnail_file(&path, resolved_slot)
    })
    .await
    .map_err(|e| {
        format!(
            "表示用サムネイル生成タスクの待機に失敗しました ({}): {}",
            display_path, e
        )
    })?
}

/// Creates a grid thumbnail on a blocking worker thread.
#[tauri::command]
async fn create_grid_thumbnail(path: String, source_slot: Option<i64>) -> Result<String, String> {
    let display_path = path.clone();
    let resolved_slot = source_slot.unwrap_or(1);
    tauri::async_runtime::spawn_blocking(move || {
        utils::create_grid_thumbnail_file(&path, resolved_slot)
    })
    .await
    .map_err(|e| {
        format!(
            "一覧用サムネイル生成タスクの待機に失敗しました ({}): {}",
            display_path, e
        )
    })?
}

/// Saves a photo memo and returns the refreshed record.
#[tauri::command]
async fn save_photo_memo_cmd(
    photo_path: String,
    memo: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::save_photo_memo(source_slot, &photo_path, &memo)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

/// Loads the saved memo text for a photo.
#[tauri::command]
async fn get_photo_memo_cmd(photo_path: String, source_slot: i64) -> Result<String, String> {
    db::get_photo_memo(source_slot, &photo_path)
}

/// Loads the saved tags for a photo.
#[tauri::command]
async fn get_photo_tags_cmd(photo_path: String, source_slot: i64) -> Result<Vec<String>, String> {
    db::get_photo_tags(source_slot, &photo_path)
}

/// Toggles the favorite flag for one photo and returns the refreshed record.
#[tauri::command]
async fn set_photo_favorite_cmd(
    photo_path: String,
    is_favorite: bool,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::set_photo_favorite(source_slot, &photo_path, is_favorite)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

/// Toggles the favorite flag for a batch of photos.
#[tauri::command]
async fn bulk_set_photo_favorite_cmd(
    photos: Vec<PhotoBatchEntry>,
    is_favorite: bool,
) -> Result<Vec<PhotoRecord>, String> {
    let mut updated_photos = Vec::with_capacity(photos.len());
    for photo in photos {
        db::set_photo_favorite(photo.source_slot, &photo.photo_path, is_favorite)?;
        updated_photos.push(db::get_photo_record(
            photo.source_slot,
            &photo.photo_path,
            true,
        )?);
    }
    Ok(updated_photos)
}

/// Adds a tag to one photo and returns the refreshed record.
#[tauri::command]
async fn add_photo_tag_cmd(
    photo_path: String,
    tag: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::add_photo_tag(source_slot, &photo_path, &tag)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

/// Adds the same tag to a batch of photos.
#[tauri::command]
async fn bulk_add_photo_tag_cmd(
    photos: Vec<PhotoBatchEntry>,
    tag: String,
) -> Result<Vec<PhotoRecord>, String> {
    let mut updated_photos = Vec::with_capacity(photos.len());
    for photo in photos {
        db::add_photo_tag(photo.source_slot, &photo.photo_path, &tag)?;
        updated_photos.push(db::get_photo_record(
            photo.source_slot,
            &photo.photo_path,
            true,
        )?);
    }
    Ok(updated_photos)
}

/// Removes a tag from one photo and returns the refreshed record.
#[tauri::command]
async fn remove_photo_tag_cmd(
    photo_path: String,
    tag: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::remove_photo_tag(source_slot, &photo_path, &tag)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

/// Lists all tag masters.
#[tauri::command]
fn get_all_tags_cmd() -> Result<Vec<String>, String> {
    db::get_all_tags()
}

/// Creates a tag master entry.
#[tauri::command]
fn create_tag_master_cmd(tag: String) -> Result<(), String> {
    db::create_tag_master(&tag)
}

/// Deletes a tag master entry.
#[tauri::command]
fn delete_tag_master_cmd(tag: String) -> Result<(), String> {
    db::delete_tag_master(&tag)
}

/// Clears the photo cache database and generated assets.
#[tauri::command]
async fn reset_photo_cache_cmd() -> Result<(), String> {
    db::reset_photo_cache()
}

/// Loads cache-backup metadata for a photo folder.
#[tauri::command]
fn get_backup_candidate_cmd(
    photo_folder_path: String,
) -> Result<Option<db::BackupCandidate>, String> {
    db::get_backup_candidate(&photo_folder_path)
}

/// Creates a cache backup for a photo folder.
#[tauri::command]
fn create_cache_backup_cmd(
    photo_folder_path: String,
) -> Result<Option<db::BackupCandidate>, String> {
    db::create_cache_backup(&photo_folder_path)
}

/// Restores a cache backup for a photo folder.
#[tauri::command]
fn restore_cache_backup_cmd(photo_folder_path: String) -> Result<bool, String> {
    db::restore_cache_backup(&photo_folder_path)
}

/// Opens the `VRChat` world page for a validated world id.
#[tauri::command]
async fn open_world_url(app: AppHandle, world_id: String) -> Result<(), String> {
    if !WORLD_ID_RE.is_match(&world_id) {
        return Err(format!("VRChat ワールドIDの形式が不正です: {world_id}"));
    }
    let url = format!("https://vrchat.com/home/world/{world_id}/info");
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|err| format!("ワールドURLを開けません [{url}]: {err}"))?;
    Ok(())
}

/// Opens a validated tweet-intent URL in the browser.
#[tauri::command]
async fn open_tweet_intent_cmd(app: AppHandle, intent_url: String) -> Result<(), String> {
    if !intent_url.starts_with("https://twitter.com/intent/tweet?text=")
        && !intent_url.starts_with("https://x.com/intent/tweet?text=")
    {
        return Err(format!("Tweet intent URL の形式が不正です: {intent_url}"));
    }

    app.opener()
        .open_url(&intent_url, None::<&str>)
        .map_err(|err| {
            format!(
                "Tweet intent URL を開けませんでした [{}]: {}",
                intent_url, err
            )
        })?;
    Ok(())
}

/// Builds grouped display items for the frontend without round-tripping grouping logic.
#[tauri::command]
fn build_display_photo_items_cmd(
    request: PhotoGroupingRequest,
) -> Result<Vec<DisplayPhotoItemRecord>, String> {
    Ok(build_display_photo_items(
        &request.photos,
        &request.grouping_mode,
    ))
}

/// Returns the similarity group surrounding an anchor photo.
#[tauri::command]
fn get_adjacent_similar_photo_group_cmd(
    request: SimilarGroupRequest,
) -> Result<Vec<PhotoRecord>, String> {
    let mut group = build_adjacent_similar_photo_group(&request.photos, &request.anchor_photo_path);
    if let Some(limit) = request.limit {
        group.truncate(limit);
    }
    Ok(group)
}

/// Builds a tweet intent for a photo, opens it, and reveals the file in Explorer.
#[tauri::command]
async fn tweet_photo_cmd(
    app: AppHandle,
    photo: PhotoRecord,
    template: String,
) -> Result<(), String> {
    let tweet_text = build_tweet_text(&photo, &template);
    if tweet_text.is_empty() {
        return Err("Tweet 本文を生成できませんでした".to_string());
    }

    let intent_url = format!(
        "https://twitter.com/intent/tweet?text={}",
        urlencoding::encode(&tweet_text)
    );
    open_tweet_intent_cmd(app, intent_url).await?;
    show_in_explorer(photo.photo_path).await
}

/// Reveals a file in the platform file manager.
#[tauri::command]
async fn show_in_explorer(path: String) -> Result<(), String> {
    let path_ref = Path::new(&path);
    if !path_ref.exists() {
        return Err(format!("対象ファイルが見つかりません: {path}"));
    }
    opener::reveal(path_ref)
        .map_err(|err| format!("エクスプローラーで表示できません [{path}]: {err}"))
}

/// Copies multiple photos on a blocking worker thread.
#[tauri::command]
async fn bulk_copy_photos_cmd(
    photo_paths: Vec<String>,
    destination_dir: String,
) -> Result<usize, String> {
    let destination_for_error = destination_dir.clone();
    tauri::async_runtime::spawn_blocking(move || {
        utils::copy_photo_files(&photo_paths, &destination_dir)
    })
    .await
    .map_err(|err| {
        format!(
            "一括コピー処理の待機に失敗しました [{}]: {}",
            destination_for_error, err
        )
    })?
}

/// Loads the persisted application settings.
#[tauri::command]
fn get_setting_cmd() -> AlpheratzSetting {
    load_setting()
}

/// Saves the persisted application settings.
#[tauri::command]
fn save_setting_cmd(setting: AlpheratzSetting) -> Result<(), String> {
    save_setting(&setting)
}

/// Returns the saved startup-enabled flag and whether the user has set it before.
#[tauri::command]
fn get_startup_preference_cmd() -> (bool, bool) {
    let setting = load_setting();
    (setting.enable_startup, setting.startup_preference_set)
}

/// Saves the startup preference and updates OS startup registration.
#[tauri::command]
fn save_startup_preference_cmd(enabled: bool) -> Result<(), String> {
    let mut setting = load_setting();
    setting.enable_startup = enabled;
    setting.startup_preference_set = true;
    save_setting(&setting)?;
    utils::set_startup_enabled("Alpheratz", enabled)?;
    Ok(())
}

/// Starts the background pHash worker.
#[tauri::command]
async fn start_phash_calculation_cmd(app: AppHandle) -> Result<(), String> {
    similar_photo_match::start_phash_worker(app);
    Ok(())
}

/// Returns the latest pHash progress snapshot.
#[tauri::command]
fn get_phash_progress_cmd(app: AppHandle) -> PHashProgressPayload {
    similar_photo_match::get_phash_progress(&app)
}

/// Starts the background orientation worker.
#[tauri::command]
async fn start_orientation_calculation_cmd(app: AppHandle) -> Result<(), String> {
    orientation::start_orientation_worker(app);
    Ok(())
}

/// Returns the latest orientation progress snapshot.
#[tauri::command]
fn get_orientation_progress_cmd(app: AppHandle) -> OrientationProgressPayload {
    orientation::get_orientation_progress(&app)
}

/// Resolves unknown-world photos from the archived `Polaris` logs.
#[tauri::command]
fn resolve_unknown_worlds_from_archive_cmd() -> Result<usize, String> {
    scanner::resolve_unknown_worlds_from_archive()
}

/// Resolves unknown-world photos from already known similar photos.
#[tauri::command]
fn resolve_unknown_worlds_from_similar_photos_cmd() -> Result<usize, String> {
    scanner::resolve_unknown_worlds_from_similar_photos()
}

/// Initializes shared state, registers commands, and runs the Tauri app.
///
/// Database initialization happens before the window is built so command handlers can
/// assume the cache schema already exists.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(err) = init_alpheratz_db() {
        let message = format!("Alpheratz DB の初期化に失敗したため起動できません: {err}");
        utils::log_err(&message);
        return;
    }

    let run_result = Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ScanCancelStatus(AtomicBool::new(false)))
        .manage(PHashWorkerState {
            running: AtomicBool::new(false),
            progress: std::sync::Mutex::new(PHashProgressPayload::default()),
        })
        .manage(OrientationWorkerState {
            running: AtomicBool::new(false),
            progress: std::sync::Mutex::new(OrientationProgressPayload::default()),
        })
        .setup(|app| {
            let has_pending = match similar_photo_match::has_pending_phash() {
                Ok(value) => value,
                Err(err) => {
                    utils::log_warn(&format!(
                        "未処理の PDQ 状態を確認できませんでした。自動再開をスキップします: {}",
                        err
                    ));
                    false
                }
            };
            if has_pending {
                similar_photo_match::start_phash_worker(app.handle().clone());
            }
            Ok(())
        })
        .invoke_handler(generate_handler![
            get_setting_cmd,
            save_setting_cmd,
            initialize_scan,
            cancel_scan,
            get_photos,
            create_display_thumbnail,
            create_grid_thumbnail,
            save_photo_memo_cmd,
            get_photo_memo_cmd,
            get_photo_tags_cmd,
            set_photo_favorite_cmd,
            bulk_set_photo_favorite_cmd,
            add_photo_tag_cmd,
            bulk_add_photo_tag_cmd,
            remove_photo_tag_cmd,
            get_all_tags_cmd,
            create_tag_master_cmd,
            delete_tag_master_cmd,
            reset_photo_cache_cmd,
            get_backup_candidate_cmd,
            create_cache_backup_cmd,
            restore_cache_backup_cmd,
            open_world_url,
            open_tweet_intent_cmd,
            tweet_photo_cmd,
            show_in_explorer,
            build_display_photo_items_cmd,
            get_adjacent_similar_photo_group_cmd,
            bulk_copy_photos_cmd,
            get_startup_preference_cmd,
            save_startup_preference_cmd,
            start_phash_calculation_cmd,
            get_phash_progress_cmd,
            start_orientation_calculation_cmd,
            get_orientation_progress_cmd,
            resolve_unknown_worlds_from_archive_cmd,
            resolve_unknown_worlds_from_similar_photos_cmd,
        ])
        .run(tauri::generate_context!());

    if let Err(err) = run_result {
        utils::log_err(&format!("Tauri ランタイムの起動に失敗しました: {err}"));
    }
}
