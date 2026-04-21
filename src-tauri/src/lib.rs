use regex::Regex;
use serde::Deserialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;
use tauri::{generate_handler, AppHandle, Builder, State};
use tauri_plugin_opener::OpenerExt;

use orientation::{OrientationProgressPayload, OrientationWorkerState};
use similar_photo_match::{PHashProgressPayload, PHashWorkerState};

// フォルダスキャンの中断状態を共有する。
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

// VRChat ワールド ID 検証用の正規表現を用意する。
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

// DB の区切り文字列から pHash バリエーションを取り出す。
fn parse_hash_variants(value: Option<&str>) -> Vec<String> {
    value
        .unwrap_or_default()
        .split('|')
        .map(|item| item.trim().to_ascii_lowercase())
        .filter(|item| item.len() == 64 && item.chars().all(|ch| ch.is_ascii_hexdigit()))
        .collect()
}

// 16 進ハッシュ同士の Hamming 距離を計算する。
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

// すべての hash 組み合わせから最小距離を返す。
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

// ワールド名比較用に表記ゆれを吸収する。
fn normalize_world_name(value: Option<&str>) -> String {
    value.unwrap_or_default().trim().to_lowercase()
}

// 類似判定に使う前提条件を写真メタデータで揃える。
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

// 隣接写真を同じ類似グループへ入れるか判定する。
fn are_adjacent_photos_similar(left: &PhotoRecord, right: &PhotoRecord) -> bool {
    if !can_group_by_photo_meta(left, right) {
        return false;
    }

    let left_hashes = parse_hash_variants(left.phash.as_deref());
    let right_hashes = parse_hash_variants(right.phash.as_deref());
    matches!(get_closest_hash_distance(&left_hashes, &right_hashes), Some(distance) if distance <= 124)
}

// 並び順を保ったまま類似写真グループを組み立てる。
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

// 選択写真の前後から類似グループを切り出す。
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

// ワールド名ごとに写真を束ねて表示用データへ変換する。
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

// 表示モードに応じた写真表示データを組み立てる。
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

// テンプレートを展開して投稿本文を組み立てる。
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

// 実行中のフォルダスキャンへ中断要求を出す。
#[tauri::command]
async fn cancel_scan(cancel_status: State<'_, ScanCancelStatus>) -> Result<(), String> {
    cancel_status.0.store(true, Ordering::SeqCst);
    Ok(())
}

// フォルダスキャンを始め、成功後に pHash 計算を流す。
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

// フロントエンドの条件に一致する写真を返す。
#[tauri::command]
async fn get_photos(query: PhotoQuery) -> Result<Vec<PhotoRecord>, String> {
    db::get_photos(query)
}

// 詳細表示用サムネイルを別スレッドで生成する。
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

// 一覧表示用サムネイルを別スレッドで生成する。
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

// 写真メモを保存して更新後レコードを返す。
#[tauri::command]
async fn save_photo_memo_cmd(
    photo_path: String,
    memo: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::save_photo_memo(source_slot, &photo_path, &memo)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

// 保存済みメモを読み込む。
#[tauri::command]
async fn get_photo_memo_cmd(photo_path: String, source_slot: i64) -> Result<String, String> {
    db::get_photo_memo(source_slot, &photo_path)
}

// 保存済みタグを読み込む。
#[tauri::command]
async fn get_photo_tags_cmd(photo_path: String, source_slot: i64) -> Result<Vec<String>, String> {
    db::get_photo_tags(source_slot, &photo_path)
}

// 1 件のお気に入り状態を更新して最新レコードを返す。
#[tauri::command]
async fn set_photo_favorite_cmd(
    photo_path: String,
    is_favorite: bool,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::set_photo_favorite(source_slot, &photo_path, is_favorite)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

// 複数写真のお気に入り状態をまとめて更新する。
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

// 写真へタグを追加して最新レコードを返す。
#[tauri::command]
async fn add_photo_tag_cmd(
    photo_path: String,
    tag: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::add_photo_tag(source_slot, &photo_path, &tag)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

// 複数写真へ同じタグをまとめて追加する。
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

// 写真からタグを外して最新レコードを返す。
#[tauri::command]
async fn remove_photo_tag_cmd(
    photo_path: String,
    tag: String,
    source_slot: i64,
) -> Result<PhotoRecord, String> {
    db::remove_photo_tag(source_slot, &photo_path, &tag)?;
    db::get_photo_record(source_slot, &photo_path, true)
}

// タグマスタ一覧を返す。
#[tauri::command]
fn get_all_tags_cmd() -> Result<Vec<String>, String> {
    db::get_all_tags()
}

// タグマスタを追加する。
#[tauri::command]
fn create_tag_master_cmd(tag: String) -> Result<(), String> {
    db::create_tag_master(&tag)
}

// タグマスタを削除する。
#[tauri::command]
fn delete_tag_master_cmd(tag: String) -> Result<(), String> {
    db::delete_tag_master(&tag)
}

// 写真 cache と生成物をまとめて削除する。
#[tauri::command]
async fn reset_photo_cache_cmd() -> Result<(), String> {
    db::reset_photo_cache()
}

// 写真フォルダに対応する cache backup 情報を返す。
#[tauri::command]
fn get_backup_candidate_cmd(
    photo_folder_path: String,
) -> Result<Option<db::BackupCandidate>, String> {
    db::get_backup_candidate(&photo_folder_path)
}

// 写真フォルダに対応する cache backup を作成する。
#[tauri::command]
fn create_cache_backup_cmd(
    photo_folder_path: String,
) -> Result<Option<db::BackupCandidate>, String> {
    db::create_cache_backup(&photo_folder_path)
}

// 写真フォルダに対応する cache backup を復元する。
#[tauri::command]
fn restore_cache_backup_cmd(photo_folder_path: String) -> Result<bool, String> {
    db::restore_cache_backup(&photo_folder_path)
}

// 妥当な VRChat ワールド URL をブラウザで開く。
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

// 妥当な Tweet intent URL をブラウザで開く。
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

// フロントエンド用の表示データを Rust 側で組み立てる。
#[tauri::command]
fn build_display_photo_items_cmd(
    request: PhotoGroupingRequest,
) -> Result<Vec<DisplayPhotoItemRecord>, String> {
    Ok(build_display_photo_items(
        &request.photos,
        &request.grouping_mode,
    ))
}

// 基準写真の前後にある類似写真グループを返す。
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

// 投稿本文を作成して投稿画面を開き、対象写真も表示する。
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

// 対象ファイルを OS のファイルマネージャで表示する。
#[tauri::command]
async fn show_in_explorer(path: String) -> Result<(), String> {
    let path_ref = Path::new(&path);
    if !path_ref.exists() {
        return Err(format!("対象ファイルが見つかりません: {path}"));
    }
    opener::reveal(path_ref)
        .map_err(|err| format!("エクスプローラーで表示できません [{path}]: {err}"))
}

// 複数写真のコピー処理を別スレッドで実行する。
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

// 永続設定を読み込む。
#[tauri::command]
fn get_setting_cmd() -> AlpheratzSetting {
    load_setting()
}

// 永続設定を保存する。
#[tauri::command]
fn save_setting_cmd(setting: AlpheratzSetting) -> Result<(), String> {
    save_setting(&setting)
}

// 自動起動設定の値と既設定フラグを返す。
#[tauri::command]
fn get_startup_preference_cmd() -> (bool, bool) {
    let setting = load_setting();
    (setting.enable_startup, setting.startup_preference_set)
}

// 自動起動設定を保存し、OS の登録も更新する。
#[tauri::command]
fn save_startup_preference_cmd(enabled: bool) -> Result<(), String> {
    let mut setting = load_setting();
    setting.enable_startup = enabled;
    setting.startup_preference_set = true;
    save_setting(&setting)?;
    utils::set_startup_enabled("Alpheratz", enabled)?;
    Ok(())
}

// 背景 pHash worker を起動する。
#[tauri::command]
async fn start_phash_calculation_cmd(app: AppHandle) -> Result<(), String> {
    similar_photo_match::start_phash_worker(app);
    Ok(())
}

// 最新の pHash 進捗を返す。
#[tauri::command]
fn get_phash_progress_cmd(app: AppHandle) -> PHashProgressPayload {
    similar_photo_match::get_phash_progress(&app)
}

// 背景 orientation worker を起動する。
#[tauri::command]
async fn start_orientation_calculation_cmd(app: AppHandle) -> Result<(), String> {
    orientation::start_orientation_worker(app);
    Ok(())
}

// 最新の orientation 進捗を返す。
#[tauri::command]
fn get_orientation_progress_cmd(app: AppHandle) -> OrientationProgressPayload {
    orientation::get_orientation_progress(&app)
}

// archive ログからワールド不明写真を補完する。
#[tauri::command]
fn resolve_unknown_worlds_from_archive_cmd() -> Result<usize, String> {
    scanner::resolve_unknown_worlds_from_archive()
}

// 既知の類似写真からワールド不明写真を補完する。
#[tauri::command]
fn resolve_unknown_worlds_from_similar_photos_cmd(target: String) -> Result<usize, String> {
    scanner::resolve_unknown_worlds_from_similar_photos(&target)
}

// 状態と command を登録し、Tauri アプリ本体を起動する。
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
