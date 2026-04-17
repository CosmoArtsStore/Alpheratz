use crate::config::load_setting;
use crate::models::{PhotoQuery, PhotoRecord};
use crate::utils::{
    clear_directory_contents, get_alpheratz_db_backup_dir, get_alpheratz_db_cache_dir,
    get_alpheratz_img_cache_dir, get_alpheratz_install_dir, get_alpheratz_log_dir,
    get_alpheratz_setting_dir,
};
use chrono::Local;
use rusqlite::{Connection, OptionalExtension};
use serde::Deserialize;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

// 設定画面へ返す cache backup 情報をまとめる。
#[derive(Debug, Clone, Serialize)]
pub struct BackupCandidate {
    pub photo_folder_path: String,
    pub backup_folder_name: String,
    pub backup_path: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
struct LegacyBackupPathEntry {
    #[serde(rename = "photoFolderPath")]
    photo_folder_path: String,
    #[serde(rename = "backupFolderName")]
    backup_folder_name: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

fn resolve_source_slot_by_photo_folder(photo_folder_path: &str) -> i64 {
    let normalized = photo_folder_path.trim();
    let setting = load_setting();
    if !setting.secondary_photo_folder_path.trim().is_empty()
        && setting.secondary_photo_folder_path.trim() == normalized
    {
        2
    } else {
        1
    }
}

fn get_legacy_backup_path_path() -> Option<PathBuf> {
    Some(get_alpheratz_setting_dir()?.join("backupPath.json"))
}

fn load_legacy_backup_paths(path: &PathBuf) -> Option<Vec<LegacyBackupPathEntry>> {
    match fs::read_to_string(path) {
        Ok(content) => match serde_json::from_str::<Vec<LegacyBackupPathEntry>>(&content) {
            Ok(entries) => Some(entries),
            Err(err) => {
                crate::utils::log_warn(&format!(
                    "旧バックアップ管理ファイルの JSON を解析できませんでした ({}): {}",
                    path.display(),
                    err
                ));
                None
            }
        },
        Err(err) => {
            crate::utils::log_warn(&format!(
                "旧バックアップ管理ファイルを読み込めませんでした ({}): {}",
                path.display(),
                err
            ));
            None
        }
    }
}

fn upsert_cache_backup_entry(
    conn: &Connection,
    photo_folder_path: &str,
    backup_folder_name: &str,
    backup_path: &str,
    created_at: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO cache_backups (photo_folder_path, backup_folder_name, backup_path, created_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(photo_folder_path) DO UPDATE SET
             backup_folder_name = excluded.backup_folder_name,
             backup_path = excluded.backup_path,
             created_at = excluded.created_at",
        rusqlite::params![
            photo_folder_path,
            backup_folder_name,
            backup_path,
            created_at
        ],
    )
    .map_err(|err| {
        format!(
            "cache_backups を保存できません [{} -> {}]: {}",
            photo_folder_path, backup_path, err
        )
    })?;
    Ok(())
}

fn remove_cache_backup_entry(conn: &Connection, photo_folder_path: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM cache_backups WHERE photo_folder_path = ?1",
        rusqlite::params![photo_folder_path],
    )
    .map_err(|err| {
        format!(
            "cache_backups を削除できません [{}]: {}",
            photo_folder_path, err
        )
    })?;
    Ok(())
}

fn load_cache_backup_candidate(
    conn: &Connection,
    photo_folder_path: &str,
) -> Result<Option<BackupCandidate>, String> {
    conn.query_row(
        "SELECT photo_folder_path, backup_folder_name, backup_path, created_at
         FROM cache_backups
         WHERE photo_folder_path = ?1",
        rusqlite::params![photo_folder_path],
        |row| {
            Ok(BackupCandidate {
                photo_folder_path: row.get(0)?,
                backup_folder_name: row.get(1)?,
                backup_path: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(|err| {
        format!(
            "cache_backups を取得できません [{}]: {}",
            photo_folder_path, err
        )
    })
}

fn migrate_legacy_backup_paths_if_needed(conn: &Connection) -> Result<(), String> {
    let Some(path) = get_legacy_backup_path_path() else {
        return Ok(());
    };
    if !path.exists() {
        return Ok(());
    }

    let Some(entries) = load_legacy_backup_paths(&path) else {
        return Ok(());
    };

    if !entries.is_empty() {
        let tx = conn.unchecked_transaction().map_err(|err| {
            format!(
                "旧バックアップ管理情報の移行トランザクションを開始できません: {}",
                err
            )
        })?;

        for entry in entries {
            let photo_folder_path = entry.photo_folder_path.trim();
            let backup_folder_name = entry.backup_folder_name.trim();
            let created_at = entry.created_at.trim();
            if photo_folder_path.is_empty() || backup_folder_name.is_empty() {
                continue;
            }

            let source_slot = resolve_source_slot_by_photo_folder(photo_folder_path);
            let slot_cache_name = if source_slot == 2 {
                "2nd-cache"
            } else {
                "1st-cache"
            };
            let backup_path =
                get_alpheratz_data_legacy_backup_db_path(backup_folder_name, slot_cache_name)
                    .map(|path| path.to_string_lossy().to_string())
                    .unwrap_or_default();

            tx.execute(
                "INSERT INTO cache_backups (photo_folder_path, backup_folder_name, backup_path, created_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(photo_folder_path) DO UPDATE SET
                     backup_folder_name = excluded.backup_folder_name,
                     backup_path = excluded.backup_path,
                     created_at = excluded.created_at",
                rusqlite::params![photo_folder_path, backup_folder_name, backup_path, created_at],
            )
            .map_err(|err| {
                format!(
                    "旧バックアップ管理情報を移行できません [{} -> {}]: {}",
                    photo_folder_path, backup_folder_name, err
                )
            })?;
        }

        tx.commit()
            .map_err(|err| format!("旧バックアップ管理情報を確定できません: {}", err))?;
    }

    if let Err(err) = fs::remove_file(&path) {
        crate::utils::log_warn(&format!(
            "移行済みの旧バックアップ管理ファイルを削除できませんでした ({}): {}",
            path.display(),
            err
        ));
    }

    Ok(())
}

fn get_alpheratz_data_legacy_backup_db_path(
    backup_folder_name: &str,
    slot_cache_name: &str,
) -> Option<PathBuf> {
    Some(
        get_alpheratz_install_dir()?
            .join("data")
            .join("backup")
            .join(backup_folder_name)
            .join(slot_cache_name)
            .join("dbCache")
            .join("Alpheratz.db"),
    )
}

fn has_db_cache_snapshot(db_path: &Path) -> bool {
    db_path.exists()
}

// Alpheratz が扱う source slot 一覧を返す。
pub fn configured_source_slots() -> Vec<i64> {
    vec![1, 2]
}

// source slot に対応する cache DB パスを返す。
pub fn get_alpheratz_db_path(source_slot: i64) -> Option<PathBuf> {
    Some(get_alpheratz_db_cache_dir(source_slot)?.join("Alpheratz.db"))
}

fn get_legacy_alpheratz_db_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(install_dir) = get_alpheratz_install_dir() {
        paths.push(install_dir.join("alpheratz.db"));
        paths.push(install_dir.join("Alpheratz.db"));
    }
    paths
}

// schema を確認したうえで source slot の cache DB を開く。
pub fn open_alpheratz_connection(source_slot: i64) -> Result<Connection, String> {
    let db_path = get_alpheratz_db_path(source_slot)
        .ok_or_else(|| "Alpheratz DB の保存先を取得できません".to_string())?;
    if !db_path.exists() {
        for legacy_path in get_legacy_alpheratz_db_paths() {
            if !legacy_path.exists() {
                continue;
            }
            std::fs::rename(&legacy_path, &db_path).map_err(|err| {
                format!(
                    "旧 Alpheratz DB を新しい保存先へ移動できません ({} -> {}): {}",
                    legacy_path.display(),
                    db_path.display(),
                    err
                )
            })?;
            break;
        }
    }
    let conn = Connection::open(&db_path)
        .map_err(|err| format!("Alpheratz DB を開けません ({}): {}", db_path.display(), err))?;
    ensure_alpheratz_schema(&conn)?;
    Ok(conn)
}

fn has_column(conn: &Connection, table_name: &str, column_name: &str) -> Result<bool, String> {
    let pragma_sql = format!("PRAGMA table_info({})", table_name);
    let mut stmt = conn
        .prepare(&pragma_sql)
        .map_err(|e| format!("テーブル情報を確認できません [{}]: {}", pragma_sql, e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("列情報を取得できません [{}]: {}", pragma_sql, e))?;

    for row in rows {
        let existing_name =
            row.map_err(|e| format!("列情報の読み取りに失敗しました [{}]: {}", pragma_sql, e))?;
        if existing_name == column_name {
            return Ok(true);
        }
    }
    Ok(false)
}

fn add_column_if_missing(
    conn: &Connection,
    table_name: &str,
    sql: &str,
    column_name: &str,
) -> Result<(), String> {
    if has_column(conn, table_name, column_name)? {
        return Ok(());
    }

    conn.execute(sql, []).map_err(|e| {
        format!(
            "列追加に失敗しました [{} / {}]: {}",
            table_name, column_name, e
        )
    })?;
    Ok(())
}

fn primary_key_column(conn: &Connection, table_name: &str) -> Result<Option<String>, String> {
    let pragma_sql = format!("PRAGMA table_info({})", table_name);
    let mut stmt = conn
        .prepare(&pragma_sql)
        .map_err(|e| format!("主キー情報を確認できません [{}]: {}", pragma_sql, e))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(1)?, row.get::<_, i64>(5)?))
        })
        .map_err(|e| format!("主キー列情報を取得できません [{}]: {}", pragma_sql, e))?;

    for row in rows {
        let (column_name, pk_order) = row.map_err(|e| {
            format!(
                "主キー列情報の読み取りに失敗しました [{}]: {}",
                pragma_sql, e
            )
        })?;
        if pk_order == 1 {
            return Ok(Some(column_name));
        }
    }

    Ok(None)
}

fn migrate_photo_schema_if_needed(conn: &Connection) -> Result<(), String> {
    let needs_migration = match primary_key_column(conn, "photos")? {
        Some(column) => column != "photo_path",
        None => false,
    } || !has_column(conn, "photos", "is_missing")?;

    if !needs_migration {
        return Ok(());
    }

    conn.execute_batch(
        "PRAGMA foreign_keys = OFF;
         BEGIN IMMEDIATE;
         ALTER TABLE photos RENAME TO photos_legacy;
         ALTER TABLE photo_tags RENAME TO photo_tags_legacy;

         CREATE TABLE photos (
             photo_path      TEXT PRIMARY KEY,
             photo_filename  TEXT NOT NULL,
             world_id        TEXT,
             world_name      TEXT,
             timestamp       TEXT NOT NULL,
             memo            TEXT DEFAULT '',
             phash           TEXT,
             phash_version   INTEGER DEFAULT 0,
             orientation     TEXT,
             image_width     INTEGER,
             image_height    INTEGER,
             source_slot     INTEGER DEFAULT 1,
             is_favorite     INTEGER DEFAULT 0,
             match_source    TEXT,
             is_missing      INTEGER DEFAULT 0
         );

         CREATE TABLE photo_tags (
             photo_path  TEXT REFERENCES photos(photo_path),
             tag_id      INTEGER REFERENCES tags(id),
             PRIMARY KEY (photo_path, tag_id)
         );

         INSERT INTO photos (
             photo_path,
             photo_filename,
             world_id,
             world_name,
             timestamp,
             memo,
             phash,
             phash_version,
             orientation,
             image_width,
             image_height,
             source_slot,
             is_favorite,
             match_source,
             is_missing
         )
         SELECT
             photo_path,
             photo_filename,
             world_id,
             world_name,
             timestamp,
             COALESCE(memo, ''),
             phash,
             0,
             orientation,
             NULL,
             NULL,
             1,
             COALESCE(is_favorite, 0),
             match_source,
             0
         FROM photos_legacy;

         INSERT INTO photo_tags (photo_path, tag_id)
         SELECT p.photo_path, pt.tag_id
         FROM photo_tags_legacy pt
         INNER JOIN photos_legacy p ON p.photo_filename = pt.photo_filename;

         DROP TABLE photo_tags_legacy;
         DROP TABLE photos_legacy;
         COMMIT;
         PRAGMA foreign_keys = ON;",
    )
    .map_err(|e| format!("写真DBスキーマ移行に失敗しました: {}", e))?;

    Ok(())
}

fn ensure_alpheratz_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;

         CREATE TABLE IF NOT EXISTS photos (
             photo_path      TEXT PRIMARY KEY,
             photo_filename  TEXT NOT NULL,
             world_id        TEXT,
             world_name      TEXT,
             timestamp       TEXT NOT NULL,
             memo            TEXT DEFAULT '',
             phash           TEXT,
             phash_version   INTEGER DEFAULT 0,
             orientation     TEXT,
             image_width     INTEGER,
             image_height    INTEGER,
             source_slot     INTEGER DEFAULT 1,
             is_favorite     INTEGER DEFAULT 0,
             match_source    TEXT,
             is_missing      INTEGER DEFAULT 0
         );

         CREATE TABLE IF NOT EXISTS tags (
             id    INTEGER PRIMARY KEY AUTOINCREMENT,
             name  TEXT NOT NULL UNIQUE
         );

         CREATE TABLE IF NOT EXISTS photo_tags (
             photo_path  TEXT REFERENCES photos(photo_path),
             tag_id      INTEGER REFERENCES tags(id),
             PRIMARY KEY (photo_path, tag_id)
         );

         CREATE TABLE IF NOT EXISTS cache_backups (
             photo_folder_path  TEXT PRIMARY KEY,
             backup_folder_name TEXT NOT NULL,
             backup_path        TEXT NOT NULL DEFAULT '',
             created_at         TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS archive_world_visits (
             id               INTEGER PRIMARY KEY AUTOINCREMENT,
             source_log_name  TEXT NOT NULL,
             world_name       TEXT NOT NULL,
             join_time        TEXT NOT NULL,
             leave_time       TEXT
         );

         CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
         CREATE INDEX IF NOT EXISTS idx_photos_world_name ON photos(world_name);
         CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos(is_favorite);
         CREATE INDEX IF NOT EXISTS idx_photos_is_missing ON photos(is_missing);
         CREATE INDEX IF NOT EXISTS idx_archive_world_visits_join_time ON archive_world_visits(join_time);
         CREATE INDEX IF NOT EXISTS idx_archive_world_visits_source_log_name ON archive_world_visits(source_log_name);",
    )
    .map_err(|e| format!("Alpheratz DB スキーマ初期化に失敗しました: {}", e))?;

    migrate_photo_schema_if_needed(conn)?;

    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN orientation TEXT",
        "orientation",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN image_width INTEGER",
        "image_width",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN image_height INTEGER",
        "image_height",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN source_slot INTEGER DEFAULT 1",
        "source_slot",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN is_favorite INTEGER DEFAULT 0",
        "is_favorite",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN match_source TEXT",
        "match_source",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN is_missing INTEGER DEFAULT 0",
        "is_missing",
    )?;
    add_column_if_missing(
        conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN phash_version INTEGER DEFAULT 0",
        "phash_version",
    )?;
    // Intentional: リリース前整理として現行スキーマだけを残し、未使用テーブルを掃除する。
    conn.execute("DROP TABLE IF EXISTS photo_embeddings", [])
        .map_err(|e| format!("不要テーブル photo_embeddings の削除に失敗しました: {}", e))?;
    add_column_if_missing(
        conn,
        "cache_backups",
        "ALTER TABLE cache_backups ADD COLUMN backup_path TEXT NOT NULL DEFAULT ''",
        "backup_path",
    )?;
    migrate_legacy_backup_paths_if_needed(conn)?;
    Ok(())
}

// すべての source slot 用 cache DB を初期化する。
pub fn init_alpheratz_db() -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    ensure_alpheratz_schema(&conn)
}

// フィルタ条件に一致する写真一覧を読み込む。
pub fn get_photos(query: PhotoQuery) -> Result<Vec<PhotoRecord>, String> {
    let conn = open_alpheratz_connection(1)?;
    let PhotoQuery {
        start_date,
        end_date,
        world_query,
        world_exact,
        orientation,
        favorites_only,
        tag_filters,
        include_phash,
    } = query;
    let mut sql = format!(
        "SELECT photo_filename, photo_path, world_id, world_name, timestamp, '' AS memo, {} AS phash, orientation, image_width, image_height, source_slot, is_favorite, match_source, is_missing FROM photos WHERE is_missing = 0",
        if include_phash == Some(true) { "phash" } else { "NULL" }
    );

    if start_date.is_some() {
        sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        sql.push_str(" AND timestamp <= :end");
    }
    if world_query.is_some() {
        sql.push_str(" AND world_name LIKE :query");
    }
    if world_exact.is_some() {
        if world_exact.as_deref() == Some("unknown") {
            sql.push_str(" AND world_name IS NULL");
        } else {
            sql.push_str(" AND world_name = :exact");
        }
    }
    if orientation.is_some() {
        sql.push_str(" AND orientation = :orientation");
    }
    if favorites_only == Some(true) {
        sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            sql.push_str(&format!(
                " AND EXISTS (
                    SELECT 1
                    FROM photo_tags pt
                    INNER JOIN tags t ON t.id = pt.tag_id
                    WHERE pt.photo_path = photos.photo_path
                      AND t.name = :tag_{index}
                )"
            ));
        }
    }

    sql.push_str(" ORDER BY timestamp DESC");

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("写真一覧クエリを準備できません [{}]: {}", sql, e))?;

    let query_val = world_query.as_ref().map(|w| format!("%{}%", w));
    let mut params = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref q) = query_val {
        params.push((":query", q as &dyn rusqlite::ToSql));
    }
    if let Some(ref x) = world_exact {
        if x != "unknown" {
            params.push((":exact", x as &dyn rusqlite::ToSql));
        }
    }
    if let Some(ref value) = orientation {
        params.push((":orientation", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        let key = Box::leak(format!(":tag_{index}").into_boxed_str());
        params.push((key, tag as &dyn rusqlite::ToSql));
    }

    let rows = stmt
        .query_map(params.as_slice(), |row| {
            Ok(PhotoRecord {
                photo_filename: row.get(0)?,
                photo_path: row.get(1)?,
                world_id: row.get(2)?,
                world_name: row.get(3)?,
                timestamp: row.get(4)?,
                memo: row.get(5)?,
                phash: row.get(6)?,
                orientation: row.get(7)?,
                image_width: row.get(8)?,
                image_height: row.get(9)?,
                source_slot: row.get::<_, i64>(10)?,
                is_favorite: row.get::<_, i64>(11)? != 0,
                tags: Vec::new(),
                match_source: row.get(12)?,
                is_missing: row.get::<_, i64>(13)? != 0,
            })
        })
        .map_err(|e| format!("写真一覧クエリを実行できません: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => {
                crate::utils::log_warn(&format!("写真行をデコードできませんでした: {}", err))
            }
        }
    }

    Ok(results)
}

// 写真メモを保存する。
pub fn save_photo_memo(source_slot: i64, filename: &str, memo: &str) -> Result<(), String> {
    let conn = open_alpheratz_connection(source_slot)?;
    let changed = conn
        .execute(
            "UPDATE photos SET memo = ?1 WHERE photo_path = ?2",
            rusqlite::params![memo, filename],
        )
        .map_err(|e| format!("写真メモを更新できません [{}]: {}", filename, e))?;
    if changed == 0 {
        return Err(format!("写真が見つかりません: {}", filename));
    }
    Ok(())
}

// 写真メモを読み込む。
pub fn get_photo_memo(source_slot: i64, filename: &str) -> Result<String, String> {
    let conn = open_alpheratz_connection(source_slot)?;
    conn.query_row(
        "SELECT COALESCE(memo, '') FROM photos WHERE photo_path = ?1",
        rusqlite::params![filename],
        |row| row.get::<_, String>(0),
    )
    .map_err(|err| format!("写真メモを取得できません [{}]: {}", filename, err))
}

// 写真に紐づくタグ一覧を読み込む。
pub fn get_photo_tags(source_slot: i64, filename: &str) -> Result<Vec<String>, String> {
    let conn = open_alpheratz_connection(source_slot)?;
    let mut stmt = conn
        .prepare(
            "SELECT t.name
             FROM photo_tags pt
             INNER JOIN tags t ON t.id = pt.tag_id
             WHERE pt.photo_path = ?1
             ORDER BY t.name COLLATE NOCASE ASC",
        )
        .map_err(|err| format!("写真タグクエリを準備できません [{}]: {}", filename, err))?;
    let rows = stmt
        .query_map(rusqlite::params![filename], |row| row.get::<_, String>(0))
        .map_err(|err| format!("写真タグを読み出せません [{}]: {}", filename, err))?;

    let mut tags = Vec::new();
    for row in rows {
        match row {
            Ok(tag) => tags.push(tag),
            Err(err) => crate::utils::log_warn(&format!(
                "写真タグ行をデコードできませんでした [{}]: {}",
                filename, err
            )),
        }
    }
    Ok(tags)
}

// source slot とファイル名から写真 1 件を読み込む。
pub fn get_photo_record(
    source_slot: i64,
    filename: &str,
    include_phash: bool,
) -> Result<PhotoRecord, String> {
    let conn = open_alpheratz_connection(source_slot)?;
    let phash_column = if include_phash { "phash" } else { "NULL" };
    let sql = format!(
        "SELECT photo_filename, photo_path, world_id, world_name, timestamp, COALESCE(memo, '') AS memo, {} AS phash, orientation, image_width, image_height, source_slot, is_favorite, match_source, is_missing
         FROM photos
         WHERE photo_path = ?1",
        phash_column
    );

    let mut record = conn
        .query_row(&sql, rusqlite::params![filename], |row| {
            Ok(PhotoRecord {
                photo_filename: row.get(0)?,
                photo_path: row.get(1)?,
                world_id: row.get(2)?,
                world_name: row.get(3)?,
                timestamp: row.get(4)?,
                memo: row.get(5)?,
                phash: row.get(6)?,
                orientation: row.get(7)?,
                image_width: row.get(8)?,
                image_height: row.get(9)?,
                source_slot: row.get::<_, i64>(10)?,
                is_favorite: row.get::<_, i64>(11)? != 0,
                tags: Vec::new(),
                match_source: row.get(12)?,
                is_missing: row.get::<_, i64>(13)? != 0,
            })
        })
        .map_err(|err| format!("写真詳細を取得できません [{}]: {}", filename, err))?;
    record.tags = get_photo_tags(source_slot, filename)?;
    Ok(record)
}

// お気に入り状態を更新する。
pub fn set_photo_favorite(
    source_slot: i64,
    filename: &str,
    is_favorite: bool,
) -> Result<(), String> {
    let conn = open_alpheratz_connection(source_slot)?;
    let changed = conn
        .execute(
            "UPDATE photos SET is_favorite = ?1 WHERE photo_path = ?2",
            rusqlite::params![if is_favorite { 1 } else { 0 }, filename],
        )
        .map_err(|e| format!("お気に入り状態を更新できません [{}]: {}", filename, e))?;
    if changed == 0 {
        return Err(format!("写真が見つかりません: {}", filename));
    }
    Ok(())
}

// 必要ならタグマスタを作りつつ写真へタグを追加する。
pub fn add_photo_tag(source_slot: i64, filename: &str, tag: &str) -> Result<(), String> {
    let conn = open_alpheratz_connection(source_slot)?;
    let tx = conn.unchecked_transaction().map_err(|e| {
        format!(
            "タグ追加トランザクションを開始できません [{}]: {}",
            filename, e
        )
    })?;

    tx.execute(
        "INSERT INTO tags (name) VALUES (?1) ON CONFLICT(name) DO NOTHING",
        rusqlite::params![tag],
    )
    .map_err(|e| format!("タグを追加できません [{}]: {}", tag, e))?;

    tx.execute(
        "INSERT INTO photo_tags (photo_path, tag_id)
         SELECT ?1, id FROM tags WHERE name = ?2
         ON CONFLICT(photo_path, tag_id) DO NOTHING",
        rusqlite::params![filename, tag],
    )
    .map_err(|e| {
        format!(
            "写真へタグを関連付けできません [{} / {}]: {}",
            filename, tag, e
        )
    })?;

    tx.commit().map_err(|e| {
        format!(
            "タグ追加トランザクションを確定できません [{}]: {}",
            filename, e
        )
    })?;
    Ok(())
}

// 写真からタグを外す。
pub fn remove_photo_tag(source_slot: i64, filename: &str, tag: &str) -> Result<(), String> {
    let conn = open_alpheratz_connection(source_slot)?;
    conn.execute(
        "DELETE FROM photo_tags
         WHERE photo_path = ?1
           AND tag_id IN (SELECT id FROM tags WHERE name = ?2)",
        rusqlite::params![filename, tag],
    )
    .map_err(|e| {
        format!(
            "写真からタグを削除できません [{} / {}]: {}",
            filename, tag, e
        )
    })?;
    Ok(())
}

// 登録済みタグマスタを一覧で返す。
pub fn get_all_tags() -> Result<Vec<String>, String> {
    let mut tags = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let conn = open_alpheratz_connection(1)?;
    let mut stmt = conn
        .prepare("SELECT name FROM tags ORDER BY name COLLATE NOCASE ASC")
        .map_err(|err| format!("タグ一覧クエリを準備できません: {}", err))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("タグ一覧を取得できません: {}", err))?;

    for row in rows {
        match row {
            Ok(tag) => {
                if seen.insert(tag.clone()) {
                    tags.push(tag);
                }
            }
            Err(err) => {
                crate::utils::log_warn(&format!("タグ行をデコードできませんでした: {}", err))
            }
        }
    }

    tags.sort();
    Ok(tags)
}

// タグマスタを 1 件追加する。
pub fn create_tag_master(tag: &str) -> Result<(), String> {
    let normalized = tag.trim();
    if normalized.is_empty() {
        return Err("タグ名が空です".to_string());
    }

    let conn = open_alpheratz_connection(1)?;
    conn.execute(
        "INSERT INTO tags (name) VALUES (?1) ON CONFLICT(name) DO NOTHING",
        rusqlite::params![normalized],
    )
    .map_err(|err| format!("タグマスタを保存できません [{}]: {}", normalized, err))?;
    Ok(())
}

// タグマスタと関連付けをまとめて削除する。
pub fn delete_tag_master(tag: &str) -> Result<(), String> {
    let normalized = tag.trim();
    if normalized.is_empty() {
        return Err("タグ名が空です".to_string());
    }

    let conn = open_alpheratz_connection(1)?;
    let tx = conn.unchecked_transaction().map_err(|err| {
        format!(
            "タグ削除トランザクションを開始できません [{}]: {}",
            normalized, err
        )
    })?;

    tx.execute(
        "DELETE FROM photo_tags WHERE tag_id IN (SELECT id FROM tags WHERE name = ?1)",
        rusqlite::params![normalized],
    )
    .map_err(|err| format!("写真とタグの関連を削除できません [{}]: {}", normalized, err))?;

    tx.execute(
        "DELETE FROM tags WHERE name = ?1",
        rusqlite::params![normalized],
    )
    .map_err(|err| format!("タグマスタを削除できません [{}]: {}", normalized, err))?;

    tx.commit()
        .map_err(|err| format!("タグ削除を確定できません [{}]: {}", normalized, err))?;
    Ok(())
}

// 写真フォルダに対応する backup 情報を読み込む。
pub fn get_backup_candidate(photo_folder_path: &str) -> Result<Option<BackupCandidate>, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(None);
    }
    let conn = open_alpheratz_connection(1)?;
    let Some(entry) = load_cache_backup_candidate(&conn, normalized)? else {
        return Ok(None);
    };

    let backup_path = PathBuf::from(&entry.backup_path);
    if !has_db_cache_snapshot(&backup_path) {
        remove_cache_backup_entry(&conn, normalized)?;
        return Ok(None);
    }

    Ok(Some(entry))
}

// 写真フォルダに対応する cache backup を作成する。
pub fn create_cache_backup(photo_folder_path: &str) -> Result<Option<BackupCandidate>, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(None);
    }

    let active_db_path = get_alpheratz_db_path(1)
        .ok_or_else(|| "Alpheratz DB の保存先を取得できません".to_string())?;
    if !has_db_cache_snapshot(&active_db_path) {
        return Ok(None);
    }

    let checkpoint_conn = open_alpheratz_connection(1)?;
    checkpoint_conn
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|err| format!("DB バックアップ前の checkpoint に失敗しました: {}", err))?;
    drop(checkpoint_conn);

    let backup_root = get_alpheratz_db_backup_dir()
        .ok_or_else(|| "dbCache バックアップフォルダを取得できません".to_string())?;
    let backup_folder_name = Local::now().format("%Y%m%d%H%M%S").to_string();
    let backup_dir = backup_root.join(&backup_folder_name);
    fs::create_dir_all(&backup_dir).map_err(|err| {
        format!(
            "db バックアップフォルダを作成できません ({}): {}",
            backup_dir.display(),
            err
        )
    })?;
    let backup_db_path = backup_dir.join("Alpheratz.db");
    fs::copy(&active_db_path, &backup_db_path).map_err(|err| {
        format!(
            "Alpheratz DB をバックアップへコピーできません ({} -> {}): {}",
            active_db_path.display(),
            backup_db_path.display(),
            err
        )
    })?;

    let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let conn = open_alpheratz_connection(1)?;
    upsert_cache_backup_entry(
        &conn,
        normalized,
        &backup_folder_name,
        &backup_db_path.to_string_lossy(),
        &created_at,
    )?;

    Ok(Some(BackupCandidate {
        photo_folder_path: normalized.to_string(),
        backup_folder_name,
        backup_path: backup_db_path.to_string_lossy().to_string(),
        created_at,
    }))
}

// 写真フォルダに対応する cache backup を復元する。
pub fn restore_cache_backup(photo_folder_path: &str) -> Result<bool, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(false);
    }

    let Some(candidate) = get_backup_candidate(normalized)? else {
        return Ok(false);
    };

    let backup_db_path = PathBuf::from(&candidate.backup_path);
    let active_db_dir = get_alpheratz_db_cache_dir(1)
        .ok_or_else(|| "dbCache の保存先を取得できません".to_string())?;
    let active_db_path = get_alpheratz_db_path(1)
        .ok_or_else(|| "Alpheratz DB の保存先を取得できません".to_string())?;
    clear_directory_contents(&active_db_dir).map_err(|err| {
        format!(
            "復元前の dbCache をクリアできません [{}]: {}",
            active_db_dir.display(),
            err
        )
    })?;

    if backup_db_path.exists() {
        fs::copy(&backup_db_path, &active_db_path).map_err(|err| {
            format!(
                "dbCache を復元できません ({} -> {}): {}",
                backup_db_path.display(),
                active_db_path.display(),
                err
            )
        })?;
    }

    if let Some(backup_dir) = backup_db_path.parent() {
        if backup_db_path.exists() {
            if let Err(err) = fs::remove_file(&backup_db_path) {
                crate::utils::log_warn(&format!(
                    "復元済みのバックアップ DB を削除できません [{}]: {}",
                    backup_db_path.display(),
                    err
                ));
            }
        }
        let has_remaining_files = fs::read_dir(backup_dir)
            .ok()
            .and_then(|mut entries| entries.next())
            .is_some();
        if !has_remaining_files {
            if let Err(err) = fs::remove_dir_all(backup_dir) {
                crate::utils::log_warn(&format!(
                    "空のバックアップ フォルダを削除できません [{}]: {}",
                    backup_dir.display(),
                    err
                ));
            }
        }
    }

    let conn = open_alpheratz_connection(1)?;
    remove_cache_backup_entry(&conn, normalized)?;
    Ok(true)
}

// 写真 cache と生成物をまとめて削除する。
pub fn reset_photo_cache() -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    let tx = conn.unchecked_transaction().map_err(|err| {
        format!(
            "写真キャッシュ削除トランザクションを開始できません: {}",
            err
        )
    })?;

    tx.execute("DELETE FROM photo_tags", [])
        .map_err(|err| format!("photo_tags を削除できません: {}", err))?;
    tx.execute("DELETE FROM tags", [])
        .map_err(|err| format!("tags を削除できません: {}", err))?;
    tx.execute("DELETE FROM photos", [])
        .map_err(|err| format!("photos を削除できません: {}", err))?;

    tx.commit()
        .map_err(|err| format!("写真キャッシュ削除を確定できません: {}", err))?;

    if let Err(err) = conn.execute("VACUUM", []) {
        crate::utils::log_warn(&format!("写真キャッシュの VACUUM に失敗しました: {}", err));
    }

    for source_slot in configured_source_slots() {
        if let Some(img_cache_dir) = get_alpheratz_img_cache_dir(source_slot) {
            clear_directory_contents(&img_cache_dir).map_err(|err| {
                format!(
                    "imgCache のリセットに失敗しました [{}]: {}",
                    img_cache_dir.display(),
                    err
                )
            })?;
        }
    }

    if let Some(log_dir) = get_alpheratz_log_dir() {
        clear_directory_contents(&log_dir).map_err(|err| {
            format!(
                "log のリセットに失敗しました [{}]: {}",
                log_dir.display(),
                err
            )
        })?;
    }

    Ok(())
}
