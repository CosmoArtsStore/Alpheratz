use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::sync::LazyLock;

use chrono::{DateTime, Local, NaiveDateTime};
use regex::Regex;
use rusqlite::{params, Connection, Transaction};
use tauri::{AppHandle, Emitter, Manager};

use crate::config::load_setting;
use crate::db::open_alpheratz_connection;
use crate::models::ScanProgress;
use crate::similar_photo_match;
use crate::utils;
use crate::ScanCancelStatus;

const SUPPORTED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "psd", "xcf"];
const MAX_ITXT_SIZE: usize = 4 * 1024 * 1024;
const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "vendor",
    "cache",
    "$recycle.bin",
    "system volume information",
    "thumbnails",
];

#[derive(Clone, Debug)]
struct ExistingPhotoInfo {
    photo_filename: String,
    photo_path: String,
    world_id: Option<String>,
    world_name: Option<String>,
    match_source: Option<String>,
    orientation: Option<String>,
    image_width: Option<i64>,
    image_height: Option<i64>,
    source_slot: i64,
    is_missing: bool,
}

#[derive(Clone, Debug)]
struct ScanPhotoData {
    filename: String,
    path: PathBuf,
    timestamp: String,
    world_id: Option<String>,
    world_name: Option<String>,
    orientation: Option<String>,
    image_width: Option<i64>,
    image_height: Option<i64>,
    source_slot: i64,
    match_source: Option<String>,
}

#[derive(Clone, Debug)]
struct ArchiveWorldVisit {
    source_log_name: String,
    join_time: NaiveDateTime,
    leave_time: Option<NaiveDateTime>,
    world_name: String,
}

enum ScanRefreshKind {
    Full,
    MetadataOnly,
    PathOnly,
}

enum PhotoDirErrorKind {
    NotConfigured,
    Missing(PathBuf),
}

// 正規表現を初期化し、失敗時は不一致専用パターンへ退避する。
fn compile_regex(pattern: &str, name: &str) -> Regex {
    match Regex::new(pattern) {
        Ok(re) => re,
        Err(err) => {
            crate::utils::log_err(&format!("正規表現の初期化に失敗しました [{name}]: {err}"));
            match Regex::new(r"^$") {
                Ok(fallback) => fallback,
                Err(fallback_err) => {
                    crate::utils::log_err(&format!(
                        "フォールバック用正規表現の初期化に失敗しました: {fallback_err}"
                    ));
                    std::process::abort();
                }
            }
        }
    }
}

// Tauri event を投げ、失敗時は warn として握る。
fn emit_warn<T: serde::Serialize + Clone>(app: &AppHandle, event: &str, payload: T) {
    if let Err(err) = app.emit(event, payload) {
        crate::utils::log_warn(&format!(
            "イベントを emit できませんでした [{}]: {}",
            event, err
        ));
    }
}

// スキャン系エラー文言を統一フォーマットで組み立てる。
fn scan_err<E: std::fmt::Display>(context: &str, err: E) -> String {
    format!("{context}: {err}")
}

// 行単位の読込失敗を warn に落としてスキップする。
fn warn_row_error<T, E: std::fmt::Display>(row: Result<T, E>, context: &str) -> Option<T> {
    match row {
        Ok(value) => Some(value),
        Err(err) => {
            crate::utils::log_warn(&format!("{context}: {err}"));
            None
        }
    }
}

static RE_PARSE: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"VRChat_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.(\d{3})",
        "RE_PARSE",
    )
});
static RE_ID: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"<vrc:WorldID>([^<]+)</vrc:WorldID>", "RE_ID"));
static RE_NAME: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"<vrc:WorldDisplayName>([^<]+)</vrc:WorldDisplayName>",
        "RE_NAME",
    )
});
static RE_LOG_TIME: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})", "RE_LOG_TIME"));
static RE_LOG_ENTERING: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"\[Behaviour\] Entering Room: (.*)", "RE_LOG_ENTERING"));
static RE_LOG_LEFT_ROOM: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"\[Behaviour\] OnLeftRoom", "RE_LOG_LEFT_ROOM"));

// DB 保存用にファイルパス表記を正規化する。
fn normalize_path_for_db(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

// 設定済み写真フォルダと source slot の組み合わせを返す。
fn resolve_photo_dirs() -> Result<Vec<(i64, PathBuf)>, PhotoDirErrorKind> {
    let setting = load_setting();
    if setting.photo_folder_path.is_empty() && setting.secondary_photo_folder_path.is_empty() {
        return match default_photo_dir() {
            Some(path) if path.exists() => Ok(vec![(1, path)]),
            Some(path) => Err(PhotoDirErrorKind::Missing(path)),
            None => Err(PhotoDirErrorKind::NotConfigured),
        };
    }

    let mut photo_dirs = Vec::new();

    if !setting.photo_folder_path.is_empty() {
        let configured_path = PathBuf::from(&setting.photo_folder_path);
        if !configured_path.exists() {
            return Err(PhotoDirErrorKind::Missing(configured_path));
        }
        photo_dirs.push((1, configured_path));
    }

    if !setting.secondary_photo_folder_path.is_empty() {
        let configured_path = PathBuf::from(&setting.secondary_photo_folder_path);
        if !configured_path.exists() {
            return Err(PhotoDirErrorKind::Missing(configured_path));
        }
        if !photo_dirs
            .iter()
            .any(|(_, existing_path)| existing_path == &configured_path)
        {
            photo_dirs.push((2, configured_path));
        }
    }

    if photo_dirs.is_empty() {
        Err(PhotoDirErrorKind::NotConfigured)
    } else {
        Ok(photo_dirs)
    }
}

// 写真フォルダを走査して local cache を更新する。
#[allow(clippy::too_many_lines)]
#[allow(clippy::needless_pass_by_value)]
pub fn do_scan(app: AppHandle) -> Result<(), String> {
    let photo_dirs = match resolve_photo_dirs() {
        Ok(paths) => paths,
        Err(PhotoDirErrorKind::NotConfigured) => {
            let message = "写真フォルダが未設定です。設定から参照フォルダを選択してください。";
            emit_warn(&app, "scan:error", message);
            return Err(message.to_string());
        }
        Err(PhotoDirErrorKind::Missing(path)) => {
            let message = format!(
                "写真フォルダが見つかりません。設定を確認してください: {}",
                path.display()
            );
            emit_warn(&app, "scan:error", message.clone());
            return Err(message);
        }
    };

    let mut conn = open_alpheratz_connection(1)?;
    let cancel_status = app.state::<ScanCancelStatus>();
    emit_warn(
        &app,
        "scan:progress",
        ScanProgress {
            processed: 0,
            total: 0,
            current_world: "ファイルを収集中...".into(),
            phase: "scan".into(),
        },
    );

    let existing_photos = get_existing_photos(&conn)?;
    let mut found_files = Vec::new();
    for (source_slot, photo_dir) in &photo_dirs {
        collect_photos_recursive(*source_slot, photo_dir, &mut found_files, &cancel_status);
    }

    if cancel_status.0.load(Ordering::SeqCst) {
        crate::utils::log_warn("ファイル収集中にスキャンが中断されました。");
        emit_warn(&app, "scan:error", "スキャンを中断しました");
        return Ok(());
    }

    let found_path_set: HashSet<String> = found_files
        .iter()
        .map(|(_, _, path)| normalize_path_for_db(path))
        .collect();

    let candidate_files: Vec<(String, PathBuf, i64, ScanRefreshKind)> = found_files
        .into_iter()
        .filter_map(|(slot, filename, path)| {
            let normalized_path = normalize_path_for_db(&path);
            match existing_photos.get(&normalized_path) {
                None => Some((filename, path, slot, ScanRefreshKind::Full)),
                Some(existing) => {
                    let filename_changed = existing.photo_filename != filename;
                    let missing_features = false;
                    let missing_world = existing.world_name.is_none()
                        && existing.world_id.is_none()
                        && existing.match_source.is_none();
                    let reappeared = existing.is_missing;
                    let source_changed = existing.source_slot != slot;

                    if reappeared || missing_features || source_changed {
                        Some((filename, path, slot, ScanRefreshKind::Full))
                    } else if filename_changed {
                        Some((filename, path, slot, ScanRefreshKind::PathOnly))
                    } else if missing_world && filename.to_ascii_lowercase().ends_with(".png") {
                        Some((filename, path, slot, ScanRefreshKind::MetadataOnly))
                    } else {
                        None
                    }
                }
            }
        })
        .collect();

    let total = candidate_files.len();
    emit_warn(
        &app,
        "scan:progress",
        ScanProgress {
            processed: 0,
            total,
            current_world: format!("{total} 件の更新対象を確認しました"),
            phase: "scan".into(),
        },
    );

    let tx = conn
        .transaction()
        .map_err(|err| scan_err("スキャン反映トランザクションを開始できません", err))?;
    mark_missing_photos(&tx, &existing_photos, &found_path_set)?;

    for (index, (filename, path, source_slot, refresh_kind)) in
        candidate_files.into_iter().enumerate()
    {
        if cancel_status.0.load(Ordering::SeqCst) {
            tx.rollback()
                .map_err(|err| scan_err("スキャン中断時にロールバックできません", err))?;
            crate::utils::log_warn("ユーザー操作でスキャンが中断されました。");
            emit_warn(&app, "scan:error", "スキャンを中断しました");
            return Ok(());
        }

        if let Some(photo) = analyze_photo(
            &path,
            &filename,
            source_slot,
            &existing_photos,
            &refresh_kind,
        )? {
            if cancel_status.0.load(Ordering::SeqCst) {
                tx.rollback()
                    .map_err(|err| scan_err("スキャン中断時にロールバックできません", err))?;
                crate::utils::log_warn("ユーザー操作でスキャンが中断されました。");
                emit_warn(&app, "scan:error", "スキャンを中断しました");
                return Ok(());
            }

            let current_world = photo
                .world_name
                .clone()
                .unwrap_or_else(|| "ワールド不明".to_string());
            upsert_photo_batch(&tx, &[photo])?;

            if index % 10 == 0 || index == total.saturating_sub(1) {
                emit_warn(
                    &app,
                    "scan:progress",
                    ScanProgress {
                        processed: index + 1,
                        total,
                        current_world,
                        phase: "scan".into(),
                    },
                );
            }
        }
    }

    tx.commit()
        .map_err(|err| scan_err("スキャン結果を確定できません", err))?;
    emit_warn(&app, "scan:completed", ());
    Ok(())
}

// 設定未指定時に使う既定の VRChat 写真フォルダを返す。
fn default_photo_dir() -> Option<PathBuf> {
    let user_dirs = directories::UserDirs::new()?;
    Some(user_dirs.picture_dir()?.join("VRChat"))
}

// 既存写真行を正規化パス基準の map として読み込む。
fn get_existing_photos(conn: &Connection) -> Result<HashMap<String, ExistingPhotoInfo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT photo_filename, photo_path, world_id, world_name, timestamp, match_source, orientation, image_width, image_height, source_slot, is_missing
             FROM photos",
        )
        .map_err(|e| scan_err("既存写真一覧クエリを準備できません", e))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ExistingPhotoInfo {
                photo_filename: row.get(0)?,
                photo_path: row.get(1)?,
                world_id: row.get(2)?,
                world_name: row.get(3)?,
                match_source: row.get(5)?,
                orientation: row.get(6)?,
                image_width: row.get(7)?,
                image_height: row.get(8)?,
                source_slot: row.get(9)?,
                is_missing: row.get::<_, i64>(10)? != 0,
            })
        })
        .map_err(|e| scan_err("既存写真一覧クエリを実行できません", e))?;

    let mut map = HashMap::new();
    for row in rows {
        if let Some(info) = warn_row_error(row, "既存写真行の読み取りに失敗しました")
        {
            map.insert(info.photo_path.clone(), info);
        }
    }

    Ok(map)
}

// 写真 1 件を解析し、どこまで更新が必要か判定する。
fn analyze_photo(
    path: &Path,
    filename: &str,
    source_slot: i64,
    existing_photos: &HashMap<String, ExistingPhotoInfo>,
    refresh_kind: &ScanRefreshKind,
) -> Result<Option<ScanPhotoData>, String> {
    let timestamp = resolve_photo_timestamp(path, filename)?;

    let normalized_path = normalize_path_for_db(path);
    let existing = existing_photos.get(&normalized_path);
    let (world_name, world_id, match_source) = match refresh_kind {
        ScanRefreshKind::PathOnly => (
            existing.and_then(|photo| photo.world_name.clone()),
            existing.and_then(|photo| photo.world_id.clone()),
            existing.and_then(|photo| photo.match_source.clone()),
        ),
        ScanRefreshKind::Full | ScanRefreshKind::MetadataOnly => resolve_world_info_lightweight(
            &normalized_path,
            filename,
            path,
            &timestamp,
            existing_photos,
        ),
    };
    let (orientation, image_width, image_height) = match refresh_kind {
        ScanRefreshKind::PathOnly => (
            existing.and_then(|photo| photo.orientation.clone()),
            existing.and_then(|photo| photo.image_width),
            existing.and_then(|photo| photo.image_height),
        ),
        ScanRefreshKind::Full | ScanRefreshKind::MetadataOnly => {
            let dimensions = match image::image_dimensions(path) {
                Ok(value) => Some(value),
                Err(err) => {
                    crate::utils::log_warn(&format!(
                        "画像サイズを取得できなかったため unknown として扱います [{}]: {}",
                        path.display(),
                        err
                    ));
                    None
                }
            };
            let orientation = dimensions
                .map(|(width, height)| {
                    if height > width {
                        "portrait"
                    } else {
                        "landscape"
                    }
                    .to_string()
                })
                .or_else(|| Some("unknown".to_string()));
            let image_width = dimensions.map(|(width, _)| i64::from(width));
            let image_height = dimensions.map(|(_, height)| i64::from(height));
            (orientation, image_width, image_height)
        }
    };

    Ok(Some(ScanPhotoData {
        filename: filename.to_string(),
        path: path.to_path_buf(),
        timestamp,
        world_id,
        world_name,
        orientation,
        image_width,
        image_height,
        source_slot,
        match_source,
    }))
}

// 埋め込み情報と軽量 fallback からワールド情報を決める。
fn resolve_world_info_lightweight(
    photo_path: &str,
    filename: &str,
    path: &Path,
    _timestamp: &str,
    existing_photos: &HashMap<String, ExistingPhotoInfo>,
) -> (Option<String>, Option<String>, Option<String>) {
    if filename.to_ascii_lowercase().ends_with(".png") {
        let (name, id) = extract_vrc_metadata_from_png(path);
        if name.is_some() || id.is_some() {
            return (name, id, Some("metadata".to_string()));
        }
    }

    if let Some(existing) = existing_photos.get(photo_path) {
        if existing.world_name.is_some() || existing.world_id.is_some() {
            return (
                existing.world_name.clone(),
                existing.world_id.clone(),
                Some("title".to_string()),
            );
        }
    }

    (None, None, Some("unresolved".to_string()))
}

// 並び順と絞り込みに使う代表時刻を決める。
fn resolve_photo_timestamp(path: &Path, filename: &str) -> Result<String, String> {
    if let Some(captures) = RE_PARSE.captures(filename) {
        return Ok(format!(
            "{} {}",
            &captures[1],
            captures[2].replace('-', ":")
        ));
    }

    let metadata = fs::metadata(path).map_err(|err| {
        scan_err(
            &format!("ファイルメタデータを取得できません [{}]", path.display()),
            err,
        )
    })?;
    let modified = metadata.modified().map_err(|err| {
        scan_err(
            &format!("更新日時を取得できません [{}]", path.display()),
            err,
        )
    })?;
    let local_time: DateTime<Local> = DateTime::from(modified);
    Ok(local_time.format("%Y-%m-%d %H:%M:%S").to_string())
}

// 指定時刻付近の Polaris archive からワールド名を探す。
fn lookup_world_name_from_archive_db(
    conn: &Connection,
    timestamp: &str,
) -> Result<Option<String>, String> {
    match conn.query_row(
        "SELECT world_name
         FROM archive_world_visits
         WHERE join_time <= ?1
           AND (leave_time IS NULL OR leave_time >= ?1)
         ORDER BY join_time DESC
         LIMIT 1",
        params![timestamp],
        |row| row.get::<_, String>(0),
    ) {
        Ok(world_name) => Ok(Some(world_name)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(err) => Err(scan_err(
            &format!(
                "archive ワールド時刻テーブルを参照できません [{}]",
                timestamp
            ),
            err,
        )),
    }
}

// Polaris archive から滞在ワールド範囲を読み込む。
fn load_polaris_world_visits() -> Vec<ArchiveWorldVisit> {
    let Some(archive_dir) = get_polaris_archive_dir() else {
        return Vec::new();
    };

    let entries = match fs::read_dir(&archive_dir) {
        Ok(entries) => entries,
        Err(err) => {
            crate::utils::log_warn(&format!(
                "Polaris archive フォルダを読み取れないためワールド補完をスキップします [{}]: {}",
                archive_dir.display(),
                err
            ));
            return Vec::new();
        }
    };

    let mut log_paths = Vec::new();
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "Polaris archive エントリを読み取れないため対象ログをスキップします [{}]: {}",
                    archive_dir.display(),
                    err
                ));
                continue;
            }
        };

        let log_path = entry.path();
        let Some(file_name) = log_path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };

        if file_name.starts_with("output_log_")
            && log_path
                .extension()
                .is_some_and(|extension| extension.eq_ignore_ascii_case("txt"))
        {
            log_paths.push(log_path);
        }
    }

    log_paths.sort();

    let mut world_visits = Vec::new();
    for log_path in log_paths {
        load_polaris_world_visits_from_log(&log_path, &mut world_visits);
    }

    world_visits
}

// archive ログ 1 本を読み、滞在ワールド範囲へ追加する。
fn load_polaris_world_visits_from_log(log_path: &Path, world_visits: &mut Vec<ArchiveWorldVisit>) {
    let file = match fs::File::open(log_path) {
        Ok(file) => file,
        Err(err) => {
            crate::utils::log_warn(&format!(
                "Polaris archive ログを開けないためワールド補完をスキップします [{}]: {}",
                log_path.display(),
                err
            ));
            return;
        }
    };

    let reader = BufReader::new(file);
    let mut current_world_name = None;
    let mut current_join_time = None;

    for line in reader.lines() {
        let line = match line {
            Ok(line) => line,
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "Polaris archive ログ行を読み取れないためワールド補完をスキップします [{}]: {}",
                    log_path.display(),
                    err
                ));
                return;
            }
        };

        let line_time = extract_archive_log_time(&line);

        if let Some(captures) = RE_LOG_ENTERING.captures(&line) {
            if let (Some(world_name), Some(join_time)) =
                (current_world_name.take(), current_join_time.take())
            {
                world_visits.push(ArchiveWorldVisit {
                    source_log_name: log_path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or_default()
                        .to_string(),
                    join_time,
                    leave_time: line_time,
                    world_name,
                });
            }

            if let Some(line_time) = line_time {
                current_world_name = Some(captures[1].to_string());
                current_join_time = Some(line_time);
            }

            continue;
        }

        if RE_LOG_LEFT_ROOM.is_match(&line) {
            if let (Some(world_name), Some(join_time), Some(leave_time)) = (
                current_world_name.take(),
                current_join_time.take(),
                line_time,
            ) {
                world_visits.push(ArchiveWorldVisit {
                    source_log_name: log_path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or_default()
                        .to_string(),
                    join_time,
                    leave_time: Some(leave_time),
                    world_name,
                });
            }
        }
    }

    if let (Some(world_name), Some(join_time)) = (current_world_name, current_join_time) {
        world_visits.push(ArchiveWorldVisit {
            source_log_name: log_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string(),
            join_time,
            leave_time: None,
            world_name,
        });
    }
}

// archive ログ行の先頭時刻を取り出す。
fn extract_archive_log_time(line: &str) -> Option<NaiveDateTime> {
    let captures = RE_LOG_TIME.captures(line)?;
    NaiveDateTime::parse_from_str(&captures[1], "%Y.%m.%d %H:%M:%S").ok()
}

// インストール済み Polaris の archive ディレクトリを返す。
fn get_polaris_archive_dir() -> Option<PathBuf> {
    utils::get_polaris_install_dir().map(|install_dir| install_dir.join("archive"))
}

// 現在の Polaris archive から滞在ワールド表を作り直す。
fn sync_archive_world_visits(conn: &mut Connection) -> Result<usize, String> {
    let Some(archive_dir) = get_polaris_archive_dir() else {
        return Err("ログが確認できないため保管できません。".to_string());
    };
    if !archive_dir.exists() {
        return Err("ログが確認できないため保管できません。".to_string());
    }

    let world_visits = load_polaris_world_visits();
    let tx = conn
        .transaction()
        .map_err(|err| scan_err("archive ワールド時刻テーブル更新を開始できません", err))?;

    tx.execute("DELETE FROM archive_world_visits", [])
        .map_err(|err| scan_err("archive ワールド時刻テーブルを初期化できません", err))?;

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO archive_world_visits (
                    source_log_name,
                    world_name,
                    join_time,
                    leave_time
                ) VALUES (?1, ?2, ?3, ?4)",
            )
            .map_err(|err| scan_err("archive ワールド時刻挿入を準備できません", err))?;

        for visit in &world_visits {
            stmt.execute(params![
                visit.source_log_name,
                visit.world_name,
                visit.join_time.format("%Y-%m-%d %H:%M:%S").to_string(),
                visit
                    .leave_time
                    .map(|leave_time| leave_time.format("%Y-%m-%d %H:%M:%S").to_string()),
            ])
            .map_err(|err| scan_err("archive ワールド時刻を保存できません", err))?;
        }
    }

    tx.commit()
        .map_err(|err| scan_err("archive ワールド時刻テーブル更新を確定できません", err))?;
    Ok(world_visits.len())
}

// Polaris archive を使ってワールド不明写真を補完する。
pub fn resolve_unknown_worlds_from_archive() -> Result<usize, String> {
    let mut conn = open_alpheratz_connection(1)?;
    sync_archive_world_visits(&mut conn)?;
    let unknown_photos = load_unknown_world_photos(&conn)?;
    let tx = conn
        .transaction()
        .map_err(|err| scan_err("archive 補完トランザクションを開始できません", err))?;

    let mut resolved_count = 0usize;
    for (photo_path, timestamp) in unknown_photos {
        let Some(world_name) = lookup_world_name_from_archive_db(&tx, &timestamp)? else {
            continue;
        };

        update_photo_world_name(&tx, &photo_path, &world_name, "polaris_archive")?;
        resolved_count += 1;
    }

    tx.commit()
        .map_err(|err| scan_err("archive 補完結果を確定できません", err))?;
    Ok(resolved_count)
}

// 既知の類似写真からワールド不明写真を補完する。
pub fn resolve_unknown_worlds_from_similar_photos() -> Result<usize, String> {
    let mut conn = open_alpheratz_connection(1)?;
    let unknown_photos = load_unknown_world_photos(&conn)?;
    let tx = conn
        .transaction()
        .map_err(|err| scan_err("類似写真補完トランザクションを開始できません", err))?;

    let mut resolved_count = 0usize;
    for (photo_path, _) in unknown_photos {
        match similar_photo_match::infer_world_name_from_unknown_photo(Path::new(&photo_path)) {
            Ok(Some(phash_match)) => {
                update_photo_world_name(&tx, &photo_path, &phash_match.world_name, "phash")?;
                resolved_count += 1;
            }
            Ok(None) => {}
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "類似写真からのワールド推測に失敗しました [{}]: {}",
                    photo_path, err
                ));
            }
        }
    }

    tx.commit()
        .map_err(|err| scan_err("類似写真補完結果を確定できません", err))?;
    Ok(resolved_count)
}

// 手動補完待ちの写真一覧を読み込む。
fn load_unknown_world_photos(conn: &Connection) -> Result<Vec<(String, String)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT photo_path, timestamp
             FROM photos
             WHERE is_missing = 0
               AND world_name IS NULL
               AND world_id IS NULL",
        )
        .map_err(|err| scan_err("不明ワールド写真クエリを準備できません", err))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|err| scan_err("不明ワールド写真クエリを実行できません", err))?;

    let mut photos = Vec::new();
    for row in rows {
        if let Some(photo) = warn_row_error(row, "不明ワールド写真行の読み取りに失敗しました")
        {
            photos.push(photo);
        }
    }

    Ok(photos)
}

// 写真 1 件へ解決済みワールド名と補完元を保存する。
fn update_photo_world_name(
    tx: &Transaction<'_>,
    photo_path: &str,
    world_name: &str,
    match_source: &str,
) -> Result<(), String> {
    tx.execute(
        "UPDATE photos
         SET world_name = ?1,
             match_source = ?2
         WHERE photo_path = ?3",
        params![world_name, match_source, photo_path],
    )
    .map_err(|err| {
        format!(
            "ワールド名を更新できません [{} -> {}]: {}",
            photo_path, world_name, err
        )
    })?;
    Ok(())
}

// 今回見つからなかった写真を missing 扱いへ更新する。
fn mark_missing_photos(
    tx: &Transaction<'_>,
    existing_photos: &HashMap<String, ExistingPhotoInfo>,
    found_paths: &HashSet<String>,
) -> Result<(), String> {
    let missing: Vec<String> = existing_photos
        .keys()
        .filter(|path| !found_paths.contains(*path))
        .cloned()
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    {
        let mut mark_missing = tx
            .prepare("UPDATE photos SET is_missing = 1 WHERE photo_path = ?1")
            .map_err(|e| scan_err("欠損写真更新ステートメントを準備できません", e))?;

        for photo_path in missing {
            mark_missing
                .execute(params![photo_path])
                .map_err(|e| scan_err("欠損写真を更新できません", e))?;
        }
    }
    Ok(())
}

// スキャン結果の写真一覧をまとめて upsert する。
fn upsert_photo_batch(tx: &Transaction<'_>, items: &[ScanPhotoData]) -> Result<(), String> {
    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO photos (
                    photo_path,
                    photo_filename,
                    world_id,
                    world_name,
                    timestamp,
                    orientation,
                    image_width,
                    image_height,
                    source_slot,
                    match_source,
                    is_missing
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0)
                ON CONFLICT(photo_path) DO UPDATE SET
                    photo_filename = excluded.photo_filename,
                    world_id = COALESCE(excluded.world_id, photos.world_id),
                    world_name = COALESCE(excluded.world_name, photos.world_name),
                    timestamp = excluded.timestamp,
                    orientation = COALESCE(excluded.orientation, photos.orientation),
                    image_width = COALESCE(excluded.image_width, photos.image_width),
                    image_height = COALESCE(excluded.image_height, photos.image_height),
                    source_slot = excluded.source_slot,
                    match_source = COALESCE(excluded.match_source, photos.match_source),
                    is_missing = 0",
            )
            .map_err(|err| format!("写真更新ステートメントを準備できません: {err}"))?;

        for item in items {
            stmt.execute(params![
                normalize_path_for_db(&item.path),
                item.filename,
                item.world_id,
                item.world_name,
                item.timestamp,
                item.orientation,
                item.image_width,
                item.image_height,
                item.source_slot,
                item.match_source,
            ])
            .map_err(|e| format!("写真を更新できません [{}]: {}", item.filename, e))?;
        }
    }
    Ok(())
}

#[allow(clippy::too_many_lines)]
// PNG の iTXt/XMP から VRChat ワールド情報を抜き出す。
fn extract_vrc_metadata_from_png(path: &Path) -> (Option<String>, Option<String>) {
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(err) => {
            crate::utils::log_err(&format!(
                "PNG メタデータ解析用にファイルを開けません [{}]: {}",
                path.display(),
                err
            ));
            return (None, None);
        }
    };

    let mut reader = BufReader::new(file);
    let mut sig = [0u8; 8];
    if reader.read_exact(&mut sig).is_err() || sig != *b"\x89PNG\r\n\x1a\n" {
        crate::utils::log_warn(&format!(
            "PNG シグネチャが不正なためメタデータ解析をスキップします [{}]",
            path.display()
        ));
        return (None, None);
    }

    let mut chunk_data = Vec::new();
    loop {
        let mut header = [0u8; 8];
        if reader.read_exact(&mut header).is_err() {
            break;
        }

        let chunk_len = u32::from_be_bytes([header[0], header[1], header[2], header[3]]) as usize;
        let chunk_type = [header[4], header[5], header[6], header[7]];

        if &chunk_type == b"iTXt" {
            if chunk_len > MAX_ITXT_SIZE {
                if let Err(err) = reader.seek(SeekFrom::Current(
                    i64::try_from(chunk_len).unwrap_or(i64::MAX.saturating_sub(4)) + 4,
                )) {
                    crate::utils::log_warn(&format!(
                        "大きすぎる iTXt をスキップできませんでした [{}]: {}",
                        path.display(),
                        err
                    ));
                    break;
                }
                continue;
            }
            chunk_data.clear();
            chunk_data.resize(chunk_len, 0u8);
            if reader.read_exact(&mut chunk_data).is_err() {
                crate::utils::log_err(&format!(
                    "iTXt チャンクを読み取れませんでした [{}]",
                    path.display()
                ));
                break;
            }
            if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                let keyword = String::from_utf8_lossy(&chunk_data[..null_pos]);
                if keyword == "XML:com.adobe.xmp" {
                    let mut pos = null_pos + 1;
                    if pos + 2 <= chunk_data.len() {
                        pos += 2;
                        if let Some(lang_null) = chunk_data[pos..].iter().position(|&b| b == 0) {
                            pos += lang_null + 1;
                            if let Some(tk_null) = chunk_data[pos..].iter().position(|&b| b == 0) {
                                pos += tk_null + 1;
                                let xmp_text = String::from_utf8_lossy(&chunk_data[pos..]);
                                return parse_vrc_from_xmp(&xmp_text);
                            }
                        }
                    }
                }
            }
            if let Err(err) = reader.seek(SeekFrom::Current(4)) {
                crate::utils::log_warn(&format!(
                    "iTXt CRC をスキップできませんでした [{}]: {}",
                    path.display(),
                    err
                ));
                break;
            }
        } else if &chunk_type == b"IDAT" || &chunk_type == b"IEND" {
            break;
        } else if let Err(err) = reader.seek(SeekFrom::Current(
            i64::try_from(chunk_len).unwrap_or(i64::MAX.saturating_sub(4)) + 4,
        )) {
            crate::utils::log_warn(&format!(
                "PNG チャンクをスキップできませんでした [{}]: {}",
                path.display(),
                err
            ));
            break;
        }
    }

    (None, None)
}

// XMP XML 断片から VRChat ワールド情報を読む。
fn parse_vrc_from_xmp(xmp: &str) -> (Option<String>, Option<String>) {
    let world_id = RE_ID
        .captures(xmp)
        .and_then(|capture| capture.get(1))
        .map(|match_value| match_value.as_str().to_string());
    let world_name = RE_NAME
        .captures(xmp)
        .and_then(|capture| capture.get(1))
        .map(|match_value| match_value.as_str().to_string());
    (world_name, world_id)
}

// 対応拡張子の写真ファイルを再帰的に集める。
fn collect_photos_recursive(
    source_slot: i64,
    dir: &Path,
    files: &mut Vec<(i64, String, PathBuf)>,
    cancel_status: &ScanCancelStatus,
) {
    if cancel_status.0.load(Ordering::SeqCst) {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(err) => {
            crate::utils::log_warn(&format!(
                "ディレクトリを読み取れないため走査をスキップします [{}]: {}",
                dir.display(),
                err
            ));
            return;
        }
    };

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "ディレクトリエントリの読み取りに失敗しました [{}]: {}",
                    dir.display(),
                    err
                ));
                continue;
            }
        };

        let path = entry.path();
        match fs::symlink_metadata(&path) {
            Ok(meta) => {
                if meta.file_type().is_symlink() {
                    continue;
                }
            }
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "シンボリックリンク情報を取得できませんでした [{}]: {}",
                    path.display(),
                    err
                ));
            }
        }

        if path.is_dir() {
            if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
                let name_lower = name.to_lowercase();
                if name.starts_with('.') || SKIP_DIRS.contains(&name_lower.as_str()) {
                    continue;
                }
            }
            collect_photos_recursive(source_slot, &path, files, cancel_status);
            if cancel_status.0.load(Ordering::SeqCst) {
                return;
            }
        } else if path.is_file() {
            if let Some(filename) = path.file_name().and_then(|value| value.to_str()) {
                if is_supported_image_extension(filename) {
                    files.push((source_slot, filename.to_string(), path.clone()));
                }
            }
        }
    }
}

// スキャン対象の拡張子かどうかを判定する。
fn is_supported_image_extension(filename: &str) -> bool {
    let ext = Path::new(filename)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase);
    match ext {
        Some(ext) => SUPPORTED_EXTENSIONS.contains(&ext.as_str()),
        None => false,
    }
}
