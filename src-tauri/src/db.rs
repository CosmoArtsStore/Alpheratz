use crate::config::load_setting;
use crate::config::{load_backup_paths, save_backup_paths, BackupPathEntry};
use crate::models::{
    GroupedPhotoPage, GroupedPhotoRecord, PhotoPage, PhotoRecord, SelectedPhotoRef,
    SimilarWorldCandidate, WorldFilterOption,
};
use crate::utils::{
    clear_directory_contents, get_alpheratz_backup_dir, get_alpheratz_db_cache_dir,
    get_alpheratz_img_cache_dir, get_alpheratz_install_dir, get_alpheratz_log_dir,
    create_display_thumbnail_file, resolve_thumbnail_cache_path_string,
};
use chrono::Local;
use rusqlite::Connection;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct BackupCandidate {
    pub photo_folder_path: String,
    pub backup_folder_name: String,
    pub created_at: String,
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

pub fn configured_source_slots() -> Vec<i64> {
    vec![1, 2]
}

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
               world_group_id  TEXT,
               timestamp       TEXT NOT NULL,
             memo            TEXT DEFAULT '',
             phash           TEXT,
             phash_version   INTEGER DEFAULT 0,
             pdq_group_id    TEXT,
             pdq_group_version INTEGER DEFAULT 0,
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

           CREATE TABLE IF NOT EXISTS similar_world_candidates (
               target_photo_path TEXT NOT NULL,
               source_photo_path TEXT NOT NULL,
               distance          INTEGER NOT NULL,
               similarity        REAL NOT NULL,
               PRIMARY KEY (target_photo_path, source_photo_path)
           );

           CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
           CREATE INDEX IF NOT EXISTS idx_photos_world_name ON photos(world_name);
           CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos(is_favorite);
           CREATE INDEX IF NOT EXISTS idx_photos_is_missing ON photos(is_missing);
           CREATE INDEX IF NOT EXISTS idx_similar_world_candidates_target ON similar_world_candidates(target_photo_path);",
      )
    .map_err(|e| format!("Alpheratz DB スキーマ初期化に失敗しました: {}", e))?;

    migrate_photo_schema_if_needed(&conn)?;

    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN orientation TEXT",
        "orientation",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN image_width INTEGER",
        "image_width",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN image_height INTEGER",
        "image_height",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN source_slot INTEGER DEFAULT 1",
        "source_slot",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN is_favorite INTEGER DEFAULT 0",
        "is_favorite",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN match_source TEXT",
        "match_source",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN is_missing INTEGER DEFAULT 0",
        "is_missing",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN phash_version INTEGER DEFAULT 0",
        "phash_version",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN pdq_group_id TEXT",
        "pdq_group_id",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN pdq_group_version INTEGER DEFAULT 0",
        "pdq_group_version",
    )?;
    add_column_if_missing(
        &conn,
        "photos",
        "ALTER TABLE photos ADD COLUMN world_group_id TEXT",
        "world_group_id",
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_photos_pdq_group_id ON photos(pdq_group_id)",
        [],
    )
    .map_err(|e| format!("PDQ grouped index を作成できません: {}", e))?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_photos_world_group_id ON photos(world_group_id)",
        [],
    )
    .map_err(|e| format!("world grouped index を作成できません: {}", e))?;
    conn.execute(
        "UPDATE photos
         SET world_group_id = CASE
             WHEN world_id IS NOT NULL AND TRIM(world_id) != '' THEN 'id:' || TRIM(world_id)
             WHEN world_name IS NOT NULL AND TRIM(world_name) != '' THEN 'name:' || TRIM(world_name)
             ELSE 'unknown:' || photo_path
         END
         WHERE world_group_id IS NULL OR TRIM(world_group_id) = ''",
        [],
    )
    .map_err(|e| format!("world_group_id を既存写真へ補完できません: {}", e))?;
    // Intentional: pre-release cleanup. We only keep the current schema and remove abandoned tables.
    conn.execute("DROP TABLE IF EXISTS photo_embeddings", [])
        .map_err(|e| format!("不要テーブル photo_embeddings の削除に失敗しました: {}", e))?;
    Ok(())
}

pub fn init_alpheratz_db() -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    ensure_alpheratz_schema(&conn)
}

pub fn get_photos(
    start_date: Option<String>,
    end_date: Option<String>,
    world_query: Option<String>,
    world_exacts: Option<Vec<String>>,
    source_slot: Option<i64>,
    orientation: Option<String>,
    favorites_only: Option<bool>,
    tag_filters: Option<Vec<String>>,
    include_phash: Option<bool>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<PhotoPage, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut where_sql = String::from(" FROM photos WHERE is_missing = 0");

    if start_date.is_some() {
        where_sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        where_sql.push_str(" AND timestamp <= :end");
    }
    if world_query.is_some() {
        where_sql.push_str(" AND world_name LIKE :query");
    }
    if let Some(filters) = &world_exacts {
        if !filters.is_empty() {
            let include_unknown = filters.iter().any(|value| value == "unknown");
            let named_filters: Vec<&String> = filters
                .iter()
                .filter(|value| value.as_str() != "unknown")
                .collect();
            where_sql.push_str(" AND (");
            let mut has_clause = false;
            if !named_filters.is_empty() {
                where_sql.push_str("world_name IN (");
                for (index, _) in named_filters.iter().enumerate() {
                    if index > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push_str(&format!(":world_exact_{index}"));
                }
                where_sql.push(')');
                has_clause = true;
            }
            if include_unknown {
                if has_clause {
                    where_sql.push_str(" OR ");
                }
                where_sql.push_str("world_name IS NULL");
            }
            where_sql.push(')');
        }
    }
    if orientation.is_some() {
        where_sql.push_str(" AND orientation = :orientation");
    }
    if source_slot.is_some() {
        where_sql.push_str(" AND source_slot = :source_slot");
    }
    if favorites_only == Some(true) {
        where_sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            where_sql.push_str(&format!(
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

    let count_sql = format!("SELECT COUNT(*){}", where_sql);
    let mut sql = format!(
        "SELECT photo_filename, photo_path, world_id, world_name, timestamp, '' AS memo, {} AS phash, orientation, image_width, image_height, source_slot, is_favorite, match_source, is_missing",
        if include_phash == Some(true) { "phash" } else { "NULL" }
    );
    sql.push_str(&where_sql);

    sql.push_str(" ORDER BY timestamp DESC");
    if let Some(limit) = limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    if let Some(offset) = offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let query_val = world_query.as_ref().map(|w| format!("%{}%", w));
    let mut params = Vec::new();
    let mut dynamic_params: Vec<(String, String)> = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref q) = query_val {
        params.push((":query", q as &dyn rusqlite::ToSql));
    }
    let world_exact_bindings = world_exacts.unwrap_or_default();
    for (index, world_name) in world_exact_bindings
        .iter()
        .filter(|value| value.as_str() != "unknown")
        .enumerate()
    {
        dynamic_params.push((format!(":world_exact_{index}"), world_name.clone()));
    }
    if let Some(ref value) = orientation {
        params.push((":orientation", value as &dyn rusqlite::ToSql));
    }
    if let Some(ref value) = source_slot {
        params.push((":source_slot", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        dynamic_params.push((format!(":tag_{index}"), tag.clone()));
    }
    for (key, value) in &dynamic_params {
        params.push((key.as_str(), value as &dyn rusqlite::ToSql));
    }

    let total = conn
        .query_row(&count_sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map_err(|e| format!("写真件数クエリを実行できません [{}]: {}", count_sql, e))?
        .max(0) as usize;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("写真一覧クエリを準備できません [{}]: {}", sql, e))?;

    let rows = stmt
        .query_map(params.as_slice(), |row| {
            let photo_path = row.get::<_, String>(1)?;
            let source_slot = row.get::<_, i64>(10)?;
            Ok(PhotoRecord {
                photo_filename: row.get(0)?,
                photo_path: photo_path.clone(),
                resolved_photo_path: None,
                grid_thumb_path: resolve_thumbnail_cache_path_string(
                    &photo_path,
                    source_slot,
                    "browse.v3",
                )
                .ok(),
                display_thumb_path: resolve_thumbnail_cache_path_string(
                    &photo_path,
                    source_slot,
                    "browse.v3",
                )
                .ok(),
                world_id: row.get(2)?,
                world_name: row.get(3)?,
                timestamp: row.get(4)?,
                memo: row.get(5)?,
                phash: row.get(6)?,
                orientation: row.get(7)?,
                image_width: row.get(8)?,
                image_height: row.get(9)?,
                source_slot,
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
            Err(err) => crate::utils::log_warn(&format!("photo row decode failed: {}", err)),
        }
    }

    Ok(PhotoPage {
        items: results,
        total,
    })
}

pub fn get_list_photos_minimal(
    start_date: Option<String>,
    end_date: Option<String>,
    world_query: Option<String>,
    world_exacts: Option<Vec<String>>,
    source_slot: Option<i64>,
    orientation: Option<String>,
    favorites_only: Option<bool>,
    tag_filters: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<PhotoPage, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut where_sql = String::from(" FROM photos WHERE is_missing = 0");

    if start_date.is_some() {
        where_sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        where_sql.push_str(" AND timestamp <= :end");
    }
    if world_query.is_some() {
        where_sql.push_str(" AND world_name LIKE :query");
    }
    if let Some(filters) = &world_exacts {
        if !filters.is_empty() {
            let include_unknown = filters.iter().any(|value| value == "unknown");
            let named_filters: Vec<&String> = filters
                .iter()
                .filter(|value| value.as_str() != "unknown")
                .collect();
            where_sql.push_str(" AND (");
            let mut has_clause = false;
            if !named_filters.is_empty() {
                where_sql.push_str("world_name IN (");
                for (index, _) in named_filters.iter().enumerate() {
                    if index > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push_str(&format!(":world_exact_{index}"));
                }
                where_sql.push(')');
                has_clause = true;
            }
            if include_unknown {
                if has_clause {
                    where_sql.push_str(" OR ");
                }
                where_sql.push_str("world_name IS NULL");
            }
            where_sql.push(')');
        }
    }
    if orientation.is_some() {
        where_sql.push_str(" AND orientation = :orientation");
    }
    if source_slot.is_some() {
        where_sql.push_str(" AND source_slot = :source_slot");
    }
    if favorites_only == Some(true) {
        where_sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            where_sql.push_str(&format!(
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

    let count_sql = format!("SELECT COUNT(*){}", where_sql);
    let mut sql = String::from(
        "SELECT CAST(rowid AS TEXT) AS photo_key,
                photo_path,
                COALESCE(world_name, '') AS world_name,
                timestamp,
                is_favorite
         ",
    );
    sql.push_str(&where_sql);
    sql.push_str(" ORDER BY timestamp DESC");
    if let Some(limit) = limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    if let Some(offset) = offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let query_val = world_query.as_ref().map(|w| format!("%{}%", w));
    let mut params = Vec::new();
    let mut dynamic_params: Vec<(String, String)> = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref q) = query_val {
        params.push((":query", q as &dyn rusqlite::ToSql));
    }
    let world_exact_bindings = world_exacts.unwrap_or_default();
    for (index, world_name) in world_exact_bindings
        .iter()
        .filter(|value| value.as_str() != "unknown")
        .enumerate()
    {
        dynamic_params.push((format!(":world_exact_{index}"), world_name.clone()));
    }
    if let Some(ref value) = orientation {
        params.push((":orientation", value as &dyn rusqlite::ToSql));
    }
    if let Some(ref value) = source_slot {
        params.push((":source_slot", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        dynamic_params.push((format!(":tag_{index}"), tag.clone()));
    }
    for (key, value) in &dynamic_params {
        params.push((key.as_str(), value as &dyn rusqlite::ToSql));
    }

    let total = conn
        .query_row(&count_sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map_err(|e| format!("一覧件数クエリを実行できません [{}]: {}", count_sql, e))?
        .max(0) as usize;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("一覧クエリを準備できません [{}]: {}", sql, e))?;

    let rows = stmt
        .query_map(params.as_slice(), |row| {
            let resolved_photo_path = row.get::<_, String>(1)?;
            let browse_thumb_path = create_display_thumbnail_file(
                &resolved_photo_path,
                source_slot.unwrap_or(1),
            )
            .ok();
            let world_name = row.get::<_, String>(2)?;
            Ok(PhotoRecord {
                photo_filename: String::new(),
                photo_path: row.get(0)?,
                resolved_photo_path: Some(resolved_photo_path),
                grid_thumb_path: browse_thumb_path.clone(),
                display_thumb_path: browse_thumb_path,
                world_id: None,
                world_name: if world_name.trim().is_empty() {
                    None
                } else {
                    Some(world_name)
                },
                timestamp: row.get(3)?,
                memo: String::new(),
                phash: None,
                orientation: None,
                image_width: None,
                image_height: None,
                source_slot: source_slot.unwrap_or(1),
                is_favorite: row.get::<_, i64>(4)? != 0,
                tags: Vec::new(),
                match_source: None,
                is_missing: false,
            })
        })
        .map_err(|e| format!("一覧クエリを実行できません: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => crate::utils::log_warn(&format!("minimal photo row decode failed: {}", err)),
        }
    }

    Ok(PhotoPage { items: results, total })
}

pub fn get_gallery_photos_minimal(
    start_date: Option<String>,
    end_date: Option<String>,
    world_query: Option<String>,
    world_exacts: Option<Vec<String>>,
    source_slot: Option<i64>,
    favorites_only: Option<bool>,
    tag_filters: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<PhotoPage, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut where_sql = String::from(" FROM photos WHERE is_missing = 0");

    if start_date.is_some() {
        where_sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        where_sql.push_str(" AND timestamp <= :end");
    }
    if world_query.is_some() {
        where_sql.push_str(" AND world_name LIKE :query");
    }
    if let Some(filters) = &world_exacts {
        if !filters.is_empty() {
            let include_unknown = filters.iter().any(|value| value == "unknown");
            let named_filters: Vec<&String> = filters
                .iter()
                .filter(|value| value.as_str() != "unknown")
                .collect();
            where_sql.push_str(" AND (");
            let mut has_clause = false;
            if !named_filters.is_empty() {
                where_sql.push_str("world_name IN (");
                for (index, _) in named_filters.iter().enumerate() {
                    if index > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push_str(&format!(":world_exact_{index}"));
                }
                where_sql.push(')');
                has_clause = true;
            }
            if include_unknown {
                if has_clause {
                    where_sql.push_str(" OR ");
                }
                where_sql.push_str("world_name IS NULL");
            }
            where_sql.push(')');
        }
    }
    if source_slot.is_some() {
        where_sql.push_str(" AND source_slot = :source_slot");
    }
    if favorites_only == Some(true) {
        where_sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            where_sql.push_str(&format!(
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

    let count_sql = format!("SELECT COUNT(*){}", where_sql);
    let mut sql = format!(
        "SELECT CAST(rowid AS TEXT) AS photo_key,
                photo_path,
                image_width,
                image_height,
                is_favorite
         {}
         ORDER BY timestamp DESC",
        where_sql
    );
    if let Some(limit) = limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    if let Some(offset) = offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let query_val = world_query.as_ref().map(|w| format!("%{}%", w));
    let mut params = Vec::new();
    let mut dynamic_params: Vec<(String, String)> = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref q) = query_val {
        params.push((":query", q as &dyn rusqlite::ToSql));
    }
    let world_exact_bindings = world_exacts.unwrap_or_default();
    for (index, world_name) in world_exact_bindings
        .iter()
        .filter(|value| value.as_str() != "unknown")
        .enumerate()
    {
        dynamic_params.push((format!(":world_exact_{index}"), world_name.clone()));
    }
    if let Some(ref value) = source_slot {
        params.push((":source_slot", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        dynamic_params.push((format!(":tag_{index}"), tag.clone()));
    }
    for (key, value) in &dynamic_params {
        params.push((key.as_str(), value as &dyn rusqlite::ToSql));
    }

    let total = conn
        .query_row(&count_sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map_err(|e| format!("ピンボード件数クエリを実行できません [{}]: {}", count_sql, e))?
        .max(0) as usize;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("ピンボード一覧クエリを準備できません [{}]: {}", sql, e))?;

    let rows = stmt
        .query_map(params.as_slice(), |row| {
            let resolved_photo_path = row.get::<_, String>(1)?;
            let browse_thumb_path = create_display_thumbnail_file(
                &resolved_photo_path,
                source_slot.unwrap_or(1),
            )
            .ok();
            Ok(PhotoRecord {
                photo_filename: String::new(),
                photo_path: row.get(0)?,
                resolved_photo_path: Some(resolved_photo_path),
                grid_thumb_path: browse_thumb_path.clone(),
                display_thumb_path: browse_thumb_path,
                world_id: None,
                world_name: None,
                timestamp: String::new(),
                memo: String::new(),
                phash: None,
                orientation: None,
                image_width: row.get(2)?,
                image_height: row.get(3)?,
                source_slot: source_slot.unwrap_or(1),
                is_favorite: row.get::<_, i64>(4)? != 0,
                tags: Vec::new(),
                match_source: None,
                is_missing: false,
            })
        })
        .map_err(|e| format!("ピンボード一覧クエリを実行できません: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => crate::utils::log_warn(&format!("gallery minimal row decode failed: {}", err)),
        }
    }

    Ok(PhotoPage { items: results, total })
}

pub fn get_world_filter_options() -> Result<Vec<WorldFilterOption>, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut stmt = conn
        .prepare(
            "SELECT world_name, COUNT(*) AS photo_count
             FROM photos
             WHERE is_missing = 0
             GROUP BY world_name
             ORDER BY CASE WHEN world_name IS NULL OR TRIM(world_name) = '' THEN 1 ELSE 0 END,
                      photo_count DESC,
                      world_name COLLATE NOCASE ASC",
        )
        .map_err(|err| format!("ワールド一覧クエリを準備できません: {}", err))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(WorldFilterOption {
                world_name: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|err| format!("ワールド一覧クエリを実行できません: {}", err))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => crate::utils::log_warn(&format!("world filter row decode failed: {}", err)),
        }
    }

    Ok(results)
}

pub fn get_world_grouped_photos(
    start_date: Option<String>,
    end_date: Option<String>,
    world_query: Option<String>,
    world_exacts: Option<Vec<String>>,
    source_slot: Option<i64>,
    orientation: Option<String>,
    favorites_only: Option<bool>,
    tag_filters: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<GroupedPhotoPage, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut where_sql = String::from(" FROM photos WHERE is_missing = 0");

    if start_date.is_some() {
        where_sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        where_sql.push_str(" AND timestamp <= :end");
    }
    if world_query.is_some() {
        where_sql.push_str(" AND world_name LIKE :query");
    }
    if let Some(filters) = &world_exacts {
        if !filters.is_empty() {
            let include_unknown = filters.iter().any(|value| value == "unknown");
            let named_filters: Vec<&String> = filters
                .iter()
                .filter(|value| value.as_str() != "unknown")
                .collect();
            where_sql.push_str(" AND (");
            let mut has_clause = false;
            if !named_filters.is_empty() {
                where_sql.push_str("world_name IN (");
                for (index, _) in named_filters.iter().enumerate() {
                    if index > 0 {
                        where_sql.push_str(", ");
                    }
                    where_sql.push_str(&format!(":world_exact_{index}"));
                }
                where_sql.push(')');
                has_clause = true;
            }
            if include_unknown {
                if has_clause {
                    where_sql.push_str(" OR ");
                }
                where_sql.push_str("world_name IS NULL");
            }
            where_sql.push(')');
        }
    }
    if orientation.is_some() {
        where_sql.push_str(" AND orientation = :orientation");
    }
    if source_slot.is_some() {
        where_sql.push_str(" AND source_slot = :source_slot");
    }
    if favorites_only == Some(true) {
        where_sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            where_sql.push_str(&format!(
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

    let query_val = world_query.as_ref().map(|w| format!("%{}%", w));
    let mut params = Vec::new();
    let mut dynamic_params: Vec<(String, String)> = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref q) = query_val {
        params.push((":query", q as &dyn rusqlite::ToSql));
    }
    let world_exact_bindings = world_exacts.unwrap_or_default();
    for (index, world_name) in world_exact_bindings
        .iter()
        .filter(|value| value.as_str() != "unknown")
        .enumerate()
    {
        dynamic_params.push((format!(":world_exact_{index}"), world_name.clone()));
    }
    if let Some(ref value) = orientation {
        params.push((":orientation", value as &dyn rusqlite::ToSql));
    }
    if let Some(ref value) = source_slot {
        params.push((":source_slot", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        dynamic_params.push((format!(":tag_{index}"), tag.clone()));
    }
    for (key, value) in &dynamic_params {
        params.push((key.as_str(), value as &dyn rusqlite::ToSql));
    }

    let count_sql = format!(
        "WITH filtered AS (
            SELECT *, world_group_id AS group_key{}
         )
         SELECT COUNT(*)
         FROM (
             SELECT group_key
             FROM filtered
            GROUP BY group_key
        )",
        where_sql
    );
    let total = conn
        .query_row(&count_sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map_err(|e| format!("ワールド grouped 件数クエリを実行できません [{}]: {}", count_sql, e))?
        .max(0) as usize;

    let mut sql = format!(
        "WITH filtered AS (
            SELECT *, world_group_id AS group_key{}
          ),
          grouped AS (
             SELECT group_key, COUNT(*) AS group_count, MAX(timestamp) AS latest_timestamp
            FROM filtered
            GROUP BY group_key
        ),
        representatives AS (
            SELECT
                photo_filename,
                photo_path,
                world_id,
                world_name,
                timestamp,
                orientation,
                image_width,
                image_height,
                source_slot,
                is_favorite,
                match_source,
                is_missing,
                group_key,
                ROW_NUMBER() OVER (
                    PARTITION BY group_key
                    ORDER BY timestamp DESC, photo_path ASC
                ) AS row_num
            FROM filtered
        )
        SELECT
            representatives.photo_filename,
            representatives.photo_path,
            representatives.world_id,
            representatives.world_name,
            representatives.timestamp,
            '' AS memo,
            NULL AS phash,
            representatives.orientation,
            representatives.image_width,
            representatives.image_height,
            representatives.source_slot,
            representatives.is_favorite,
            representatives.match_source,
            representatives.is_missing,
            grouped.group_count,
            grouped.group_key
        FROM representatives
        INNER JOIN grouped ON grouped.group_key = representatives.group_key
        WHERE representatives.row_num = 1
        ORDER BY grouped.latest_timestamp DESC, grouped.group_key ASC",
          where_sql
      );

    if let Some(limit) = limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    if let Some(offset) = offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("ワールド grouped クエリを準備できません [{}]: {}", sql, e))?;
    let rows = stmt
        .query_map(params.as_slice(), |row| {
            let photo_path = row.get::<_, String>(1)?;
            let source_slot = row.get::<_, i64>(10)?;
            Ok(GroupedPhotoRecord {
                photo: PhotoRecord {
                    photo_filename: row.get(0)?,
                    photo_path: photo_path.clone(),
                    resolved_photo_path: None,
                    grid_thumb_path: resolve_thumbnail_cache_path_string(
                        &photo_path,
                        source_slot,
                        "browse.v3",
                    )
                    .ok(),
                    display_thumb_path: resolve_thumbnail_cache_path_string(
                        &photo_path,
                        source_slot,
                        "browse.v3",
                    )
                    .ok(),
                    world_id: row.get(2)?,
                    world_name: row.get(3)?,
                    timestamp: row.get(4)?,
                    memo: row.get(5)?,
                    phash: row.get(6)?,
                    orientation: row.get(7)?,
                    image_width: row.get(8)?,
                    image_height: row.get(9)?,
                    source_slot,
                    is_favorite: row.get::<_, i64>(11)? != 0,
                    tags: Vec::new(),
                    match_source: row.get(12)?,
                    is_missing: row.get::<_, i64>(13)? != 0,
                },
                group_count: row.get::<_, i64>(14)?.max(0) as usize,
                group_key: row.get(15)?,
            })
        })
        .map_err(|e| format!("ワールド grouped クエリを実行できません: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => crate::utils::log_warn(&format!("world grouped row decode failed: {}", err)),
        }
    }

    Ok(GroupedPhotoPage { items: results, total })
}

pub fn get_world_group_photos(
    group_key: &str,
    start_date: Option<String>,
    end_date: Option<String>,
    source_slot: Option<i64>,
    orientation: Option<String>,
    favorites_only: Option<bool>,
    tag_filters: Option<Vec<String>>,
) -> Result<Vec<PhotoRecord>, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut where_sql = String::from(
        " FROM photos WHERE is_missing = 0 AND world_group_id = :group_key",
      );

    if start_date.is_some() {
        where_sql.push_str(" AND timestamp >= :start");
    }
    if end_date.is_some() {
        where_sql.push_str(" AND timestamp <= :end");
    }
    if orientation.is_some() {
        where_sql.push_str(" AND orientation = :orientation");
    }
    if source_slot.is_some() {
        where_sql.push_str(" AND source_slot = :source_slot");
    }
    if favorites_only == Some(true) {
        where_sql.push_str(" AND is_favorite = 1");
    }
    if let Some(filters) = &tag_filters {
        for (index, _) in filters.iter().enumerate() {
            where_sql.push_str(&format!(
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

    let mut params = vec![(":group_key", &group_key as &dyn rusqlite::ToSql)];
    let mut dynamic_params: Vec<(String, String)> = Vec::new();
    if let Some(ref s) = start_date {
        params.push((":start", s as &dyn rusqlite::ToSql));
    }
    if let Some(ref e) = end_date {
        params.push((":end", e as &dyn rusqlite::ToSql));
    }
    if let Some(ref value) = orientation {
        params.push((":orientation", value as &dyn rusqlite::ToSql));
    }
    if let Some(ref value) = source_slot {
        params.push((":source_slot", value as &dyn rusqlite::ToSql));
    }
    let tag_bindings = tag_filters.unwrap_or_default();
    for (index, tag) in tag_bindings.iter().enumerate() {
        dynamic_params.push((format!(":tag_{index}"), tag.clone()));
    }
    for (key, value) in &dynamic_params {
        params.push((key.as_str(), value as &dyn rusqlite::ToSql));
    }

    let sql = format!(
        "SELECT photo_filename, photo_path, world_id, world_name, timestamp, '' AS memo, NULL AS phash, orientation, image_width, image_height, source_slot, is_favorite, match_source, is_missing{}
         ORDER BY timestamp DESC",
        where_sql
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("ワールド詳細写真クエリを準備できません [{}]: {}", sql, e))?;
    let rows = stmt
        .query_map(params.as_slice(), |row| {
            let photo_path = row.get::<_, String>(1)?;
            let source_slot = row.get::<_, i64>(10)?;
            Ok(PhotoRecord {
                photo_filename: row.get(0)?,
                photo_path: photo_path.clone(),
                resolved_photo_path: None,
                grid_thumb_path: resolve_thumbnail_cache_path_string(
                    &photo_path,
                    source_slot,
                    "browse.v3",
                )
                .ok(),
                display_thumb_path: resolve_thumbnail_cache_path_string(
                    &photo_path,
                    source_slot,
                    "browse.v3",
                )
                .ok(),
                world_id: row.get(2)?,
                world_name: row.get(3)?,
                timestamp: row.get(4)?,
                memo: row.get(5)?,
                phash: row.get(6)?,
                orientation: row.get(7)?,
                image_width: row.get(8)?,
                image_height: row.get(9)?,
                source_slot,
                is_favorite: row.get::<_, i64>(11)? != 0,
                tags: Vec::new(),
                match_source: row.get(12)?,
                is_missing: row.get::<_, i64>(13)? != 0,
            })
        })
        .map_err(|e| format!("ワールド詳細写真クエリを実行できません: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        match row {
            Ok(record) => results.push(record),
            Err(err) => crate::utils::log_warn(&format!("world group detail row decode failed: {}", err)),
        }
    }

    Ok(results)
}

pub fn get_selected_photo_refs(photo_paths: &[String]) -> Result<Vec<SelectedPhotoRef>, String> {
    if photo_paths.is_empty() {
        return Ok(Vec::new());
    }

    let conn = open_alpheratz_connection(1)?;
    let placeholders = std::iter::repeat_n("?", photo_paths.len()).collect::<Vec<_>>().join(", ");
    let sql = format!(
        "SELECT photo_path, source_slot, is_favorite FROM photos WHERE photo_path IN ({})",
        placeholders
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|err| format!("選択写真情報の取得準備に失敗しました: {}", err))?;
    let params = rusqlite::params_from_iter(photo_paths.iter());
    let rows = stmt
        .query_map(params, |row| {
            Ok(SelectedPhotoRef {
                photo_path: row.get(0)?,
                source_slot: row.get(1)?,
                is_favorite: row.get(2)?,
            })
        })
        .map_err(|err| format!("選択写真情報の取得に失敗しました: {}", err))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("選択写真情報の読み取りに失敗しました: {}", err))
}

fn load_cached_similar_world_candidates(
    conn: &Connection,
    target_photo_path: &str,
    limit: usize,
) -> Result<Vec<SimilarWorldCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT p.photo_filename, p.photo_path, p.world_id, p.world_name, p.timestamp, '' AS memo, p.phash, p.orientation, p.image_width, p.image_height, p.source_slot, p.is_favorite, p.match_source, p.is_missing, c.distance, c.similarity
             FROM similar_world_candidates c
             INNER JOIN photos p ON p.photo_path = c.source_photo_path
             WHERE c.target_photo_path = ?1
               AND p.is_missing = 0
             ORDER BY c.distance ASC, c.similarity DESC, p.timestamp DESC
             LIMIT ?2",
        )
        .map_err(|err| format!("類似候補キャッシュクエリを準備できません: {}", err))?;

    let rows = stmt
        .query_map(rusqlite::params![target_photo_path, limit as i64], |row| {
            let photo_path = row.get::<_, String>(1)?;
            let source_slot = row.get::<_, i64>(10)?;
            Ok(SimilarWorldCandidate {
                photo: PhotoRecord {
                    photo_filename: row.get(0)?,
                    photo_path: photo_path.clone(),
                    resolved_photo_path: None,
                    grid_thumb_path: resolve_thumbnail_cache_path_string(&photo_path, source_slot, "browse.v3").ok(),
                    display_thumb_path: resolve_thumbnail_cache_path_string(&photo_path, source_slot, "browse.v3").ok(),
                    world_id: row.get(2)?,
                    world_name: row.get(3)?,
                    timestamp: row.get(4)?,
                    memo: row.get(5)?,
                    phash: row.get(6)?,
                    orientation: row.get(7)?,
                    image_width: row.get(8)?,
                    image_height: row.get(9)?,
                    source_slot,
                    is_favorite: row.get::<_, i64>(11)? != 0,
                    tags: Vec::new(),
                    match_source: row.get(12)?,
                    is_missing: row.get::<_, i64>(13)? != 0,
                },
                distance: row.get::<_, i64>(14)?.max(0) as u32,
                similarity: row.get(15)?,
            })
        })
        .map_err(|err| format!("類似候補キャッシュクエリを実行できません: {}", err))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("類似候補キャッシュの読み取りに失敗しました: {}", err))
}

fn compute_similar_world_candidates_with_conn(
    conn: &Connection,
    target_photo_path: &str,
    limit: usize,
) -> Result<Vec<SimilarWorldCandidate>, String> {
    let (target_variants, target_source_slot) = conn
        .query_row(
            "SELECT phash, source_slot
             FROM photos
             WHERE photo_path = ?1
               AND is_missing = 0",
            rusqlite::params![target_photo_path],
            |row| {
                Ok((
                    crate::phash::parse_pdq_variants(row.get::<_, Option<String>>(0)?.as_deref()),
                    row.get::<_, i64>(1)?,
                ))
            },
        )
        .map_err(|err| format!("探索元写真の PDQ 情報を取得できません [{}]: {}", target_photo_path, err))?;

    let target_variants = if target_variants.is_empty() {
        let computed = crate::phash::compute_pdq_variants_from_path(target_photo_path, target_source_slot)
            .map_err(|err| format!("探索元写真の PDQ を計算できません [{}]: {}", target_photo_path, err))?;
        conn.execute(
            "UPDATE photos
             SET phash = ?1,
                 phash_version = ?2
             WHERE photo_path = ?3
               AND source_slot = ?4",
            rusqlite::params![
                computed,
                crate::phash::PHASH_VERSION,
                target_photo_path,
                target_source_slot
            ],
        )
        .map_err(|err| format!("探索元写真の PDQ を保存できません [{}]: {}", target_photo_path, err))?;
        crate::phash::parse_pdq_variants(Some(&computed))
    } else {
        target_variants
    };

    let mut stmt = conn
        .prepare(
            "SELECT photo_filename, photo_path, world_id, world_name, timestamp, '' AS memo, phash, orientation, image_width, image_height, source_slot, is_favorite, match_source, is_missing
             FROM photos
             WHERE is_missing = 0
               AND photo_path != ?1
               AND phash IS NOT NULL
               AND phash != ''
             ORDER BY timestamp DESC",
        )
        .map_err(|err| format!("類似探索候補クエリを準備できません: {}", err))?;
    let rows = stmt
        .query_map(rusqlite::params![target_photo_path], |row| {
            let photo_path = row.get::<_, String>(1)?;
            let source_slot = row.get::<_, i64>(10)?;
            Ok((
                PhotoRecord {
                    photo_filename: row.get(0)?,
                    photo_path: photo_path.clone(),
                    resolved_photo_path: None,
                    grid_thumb_path: resolve_thumbnail_cache_path_string(&photo_path, source_slot, "browse.v3").ok(),
                    display_thumb_path: resolve_thumbnail_cache_path_string(&photo_path, source_slot, "browse.v3").ok(),
                    world_id: row.get(2)?,
                    world_name: row.get(3)?,
                    timestamp: row.get(4)?,
                    memo: row.get(5)?,
                    phash: row.get(6)?,
                    orientation: row.get(7)?,
                    image_width: row.get(8)?,
                    image_height: row.get(9)?,
                    source_slot,
                    is_favorite: row.get::<_, i64>(11)? != 0,
                    tags: Vec::new(),
                    match_source: row.get(12)?,
                    is_missing: row.get::<_, i64>(13)? != 0,
                },
                crate::phash::parse_pdq_variants(row.get::<_, Option<String>>(6)?.as_deref()),
            ))
        })
        .map_err(|err| format!("類似探索候補クエリを実行できません: {}", err))?;

    let mut candidates = Vec::new();
    for row in rows {
        match row {
            Ok((photo, candidate_variants)) => {
                if let Some(distance) =
                    crate::phash::get_closest_hash_distance(&target_variants, &candidate_variants)
                {
                    let similarity = ((256u32.saturating_sub(distance)) as f32 / 256.0) * 100.0;
                    candidates.push(SimilarWorldCandidate {
                        photo,
                        distance,
                        similarity,
                    });
                }
            }
            Err(err) => crate::utils::log_warn(&format!("similar candidate row decode failed: {}", err)),
        }
    }

    candidates.sort_by(|left, right| {
        left.distance
            .cmp(&right.distance)
            .then_with(|| right.photo.world_name.is_some().cmp(&left.photo.world_name.is_some()))
            .then_with(|| right.photo.timestamp.cmp(&left.photo.timestamp))
    });
    candidates.truncate(limit);
    Ok(candidates)
}

fn save_similar_world_candidates_cache(
    conn: &Connection,
    target_photo_path: &str,
    candidates: &[SimilarWorldCandidate],
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM similar_world_candidates WHERE target_photo_path = ?1",
        rusqlite::params![target_photo_path],
    )
    .map_err(|err| format!("類似候補キャッシュを削除できません [{}]: {}", target_photo_path, err))?;

    let tx = conn
        .unchecked_transaction()
        .map_err(|err| format!("類似候補キャッシュ更新トランザクションを開始できません: {}", err))?;
    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO similar_world_candidates (target_photo_path, source_photo_path, distance, similarity)
                 VALUES (?1, ?2, ?3, ?4)",
            )
            .map_err(|err| format!("類似候補キャッシュ INSERT を準備できません: {}", err))?;
        for candidate in candidates {
            stmt.execute(rusqlite::params![
                target_photo_path,
                candidate.photo.photo_path,
                candidate.distance as i64,
                candidate.similarity
            ])
            .map_err(|err| format!("類似候補キャッシュを保存できません [{}]: {}", target_photo_path, err))?;
        }
    }
    tx.commit()
        .map_err(|err| format!("類似候補キャッシュ更新を確定できません [{}]: {}", target_photo_path, err))
}

pub fn refresh_unknown_world_similar_candidate_cache(limit: usize) -> Result<usize, String> {
    let conn = open_alpheratz_connection(1)?;
    let mut stmt = conn
        .prepare(
            "SELECT photo_path
             FROM photos
             WHERE is_missing = 0
               AND (world_name IS NULL OR TRIM(world_name) = '')
               AND phash IS NOT NULL
               AND phash != ''
             ORDER BY timestamp DESC",
        )
        .map_err(|err| format!("ワールド不明写真一覧クエリを準備できません: {}", err))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("ワールド不明写真一覧を取得できません: {}", err))?;

    let mut targets = Vec::new();
    for row in rows {
        match row {
            Ok(photo_path) => targets.push(photo_path),
            Err(err) => crate::utils::log_warn(&format!("unknown target row decode failed: {}", err)),
        }
    }

    for target_photo_path in &targets {
        let candidates = compute_similar_world_candidates_with_conn(&conn, target_photo_path, limit)?;
        save_similar_world_candidates_cache(&conn, target_photo_path, &candidates)?;
    }

    Ok(targets.len())
}

pub fn find_similar_world_candidates(
    target_photo_path: &str,
    limit: usize,
) -> Result<Vec<SimilarWorldCandidate>, String> {
    let conn = open_alpheratz_connection(1)?;
    let cached = load_cached_similar_world_candidates(&conn, target_photo_path, limit)?;
    if !cached.is_empty() {
        return Ok(cached);
    }

    let candidates = compute_similar_world_candidates_with_conn(&conn, target_photo_path, limit)?;
    save_similar_world_candidates_cache(&conn, target_photo_path, &candidates)?;
    Ok(candidates)
}

pub fn apply_world_match_from_photo(
    target_photo_path: &str,
    source_photo_path: &str,
) -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    let (world_id, world_name) = conn
        .query_row(
            "SELECT world_id, world_name
             FROM photos
             WHERE photo_path = ?1
               AND is_missing = 0",
            rusqlite::params![source_photo_path],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .map_err(|err| format!("複製元写真のワールド情報を取得できません [{}]: {}", source_photo_path, err))?;

    let changed = conn
        .execute(
            "UPDATE photos
             SET world_id = ?1,
                 world_name = ?2,
                 match_source = 'phash'
             WHERE photo_path = ?3",
            rusqlite::params![world_id, world_name, target_photo_path],
        )
        .map_err(|err| format!("ワールド情報を複製できません [{}]: {}", target_photo_path, err))?;

    if changed == 0 {
        return Err(format!("対象写真が見つかりません: {}", target_photo_path));
    }

    conn.execute(
        "DELETE FROM similar_world_candidates WHERE target_photo_path = ?1",
        rusqlite::params![target_photo_path],
    )
    .map_err(|err| format!("類似候補キャッシュを削除できません [{}]: {}", target_photo_path, err))?;

    Ok(())
}

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

pub fn get_photo_memo(source_slot: i64, filename: &str) -> Result<String, String> {
    let conn = open_alpheratz_connection(source_slot)?;
    conn.query_row(
        "SELECT COALESCE(memo, '') FROM photos WHERE photo_path = ?1",
        rusqlite::params![filename],
        |row| row.get::<_, String>(0),
    )
    .map_err(|err| format!("写真メモを取得できません [{}]: {}", filename, err))
}

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
            Err(err) => {
                crate::utils::log_warn(&format!("photo tag decode failed [{}]: {}", filename, err))
            }
        }
    }
    Ok(tags)
}

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
            Err(err) => crate::utils::log_warn(&format!("tag row decode failed: {}", err)),
        }
    }

    tags.sort_by(|left, right| left.cmp(right));
    Ok(tags)
}

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

pub fn get_backup_candidate(photo_folder_path: &str) -> Result<Option<BackupCandidate>, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(None);
    }

    let backup_root = get_alpheratz_backup_dir()
        .ok_or_else(|| "バックアップフォルダを取得できません".to_string())?;

    let mut entries = load_backup_paths();
    let candidate = entries
        .iter()
        .find(|entry| entry.photo_folder_path == normalized);

    let Some(entry) = candidate.cloned() else {
        return Ok(None);
    };

    let backup_dir = backup_root.join(&entry.backup_folder_name);
    if !backup_dir.exists() {
        entries.retain(|item| item.photo_folder_path != normalized);
        save_backup_paths(&entries)?;
        return Ok(None);
    }

    Ok(Some(BackupCandidate {
        photo_folder_path: entry.photo_folder_path,
        backup_folder_name: entry.backup_folder_name,
        created_at: entry.created_at,
    }))
}

pub fn create_cache_backup(photo_folder_path: &str) -> Result<Option<BackupCandidate>, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(None);
    }

    let source_slot = resolve_source_slot_by_photo_folder(normalized);
    let slot_cache_name = if source_slot == 2 {
        "2nd-cache"
    } else {
        "1st-cache"
    };
    let img_cache_dir = get_alpheratz_img_cache_dir(source_slot)
        .ok_or_else(|| "imgCache の保存先を取得できません".to_string())?;
    let db_cache_dir = get_alpheratz_db_cache_dir(source_slot)
        .ok_or_else(|| "dbCache の保存先を取得できません".to_string())?;

    let has_img_cache = img_cache_dir.exists()
        && fs::read_dir(&img_cache_dir)
            .map_err(|err| {
                format!(
                    "imgCache を確認できません [{}]: {}",
                    img_cache_dir.display(),
                    err
                )
            })?
            .next()
            .is_some();
    let has_db_cache = db_cache_dir.exists()
        && fs::read_dir(&db_cache_dir)
            .map_err(|err| {
                format!(
                    "dbCache を確認できません [{}]: {}",
                    db_cache_dir.display(),
                    err
                )
            })?
            .next()
            .is_some();

    if !has_img_cache && !has_db_cache {
        return Ok(None);
    }

    let backup_root = get_alpheratz_backup_dir()
        .ok_or_else(|| "バックアップフォルダを取得できません".to_string())?;
    let backup_folder_name = format!("backup{}", Local::now().format("%Y%m%d%H%M%S"));
    let backup_dir = backup_root.join(&backup_folder_name);
    fs::create_dir_all(&backup_dir).map_err(|err| {
        format!(
            "バックアップフォルダを作成できません ({}): {}",
            backup_dir.display(),
            err
        )
    })?;
    let backup_slot_dir = backup_dir.join(slot_cache_name);
    fs::create_dir_all(&backup_slot_dir).map_err(|err| {
        format!(
            "バックアップ cache フォルダを作成できません ({}): {}",
            backup_slot_dir.display(),
            err
        )
    })?;

    if has_img_cache {
        fs::rename(&img_cache_dir, backup_slot_dir.join("imgCache")).map_err(|err| {
            format!(
                "imgCache をバックアップへ移動できません ({}): {}",
                img_cache_dir.display(),
                err
            )
        })?;
        fs::create_dir_all(&img_cache_dir).map_err(|err| {
            format!(
                "移動後の imgCache を再作成できません ({}): {}",
                img_cache_dir.display(),
                err
            )
        })?;
    }

    if has_db_cache {
        fs::rename(&db_cache_dir, backup_slot_dir.join("dbCache")).map_err(|err| {
            format!(
                "dbCache をバックアップへ移動できません ({}): {}",
                db_cache_dir.display(),
                err
            )
        })?;
        fs::create_dir_all(&db_cache_dir).map_err(|err| {
            format!(
                "移動後の dbCache を再作成できません ({}): {}",
                db_cache_dir.display(),
                err
            )
        })?;
    }

    let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut entries = load_backup_paths();
    entries.retain(|entry| entry.photo_folder_path != normalized);
    entries.push(BackupPathEntry {
        photo_folder_path: normalized.to_string(),
        backup_folder_name: backup_folder_name.clone(),
        created_at: created_at.clone(),
    });
    save_backup_paths(&entries)?;

    Ok(Some(BackupCandidate {
        photo_folder_path: normalized.to_string(),
        backup_folder_name,
        created_at,
    }))
}

pub fn restore_cache_backup(photo_folder_path: &str) -> Result<bool, String> {
    let normalized = photo_folder_path.trim();
    if normalized.is_empty() {
        return Ok(false);
    }

    let Some(candidate) = get_backup_candidate(normalized)? else {
        return Ok(false);
    };

    let source_slot = resolve_source_slot_by_photo_folder(normalized);
    let slot_cache_name = if source_slot == 2 {
        "2nd-cache"
    } else {
        "1st-cache"
    };
    let backup_root = get_alpheratz_backup_dir()
        .ok_or_else(|| "バックアップフォルダを取得できません".to_string())?;
    let backup_dir = backup_root.join(&candidate.backup_folder_name);
    let backup_slot_dir = backup_dir.join(slot_cache_name);
    let backup_img_dir = backup_slot_dir.join("imgCache");
    let backup_db_dir = backup_slot_dir.join("dbCache");
    let active_img_dir = get_alpheratz_img_cache_dir(source_slot)
        .ok_or_else(|| "imgCache の保存先を取得できません".to_string())?;
    let active_db_dir = get_alpheratz_db_cache_dir(source_slot)
        .ok_or_else(|| "dbCache の保存先を取得できません".to_string())?;

    clear_directory_contents(&active_img_dir).map_err(|err| {
        format!(
            "復元前の imgCache をクリアできません [{}]: {}",
            active_img_dir.display(),
            err
        )
    })?;
    clear_directory_contents(&active_db_dir).map_err(|err| {
        format!(
            "復元前の dbCache をクリアできません [{}]: {}",
            active_db_dir.display(),
            err
        )
    })?;

    if backup_img_dir.exists() {
        fs::remove_dir_all(&active_img_dir).map_err(|err| {
            format!(
                "復元前の imgCache フォルダを削除できません [{}]: {}",
                active_img_dir.display(),
                err
            )
        })?;
        fs::rename(&backup_img_dir, &active_img_dir).map_err(|err| {
            format!(
                "imgCache を復元できません ({}): {}",
                backup_img_dir.display(),
                err
            )
        })?;
    }

    if backup_db_dir.exists() {
        fs::remove_dir_all(&active_db_dir).map_err(|err| {
            format!(
                "復元前の dbCache フォルダを削除できません [{}]: {}",
                active_db_dir.display(),
                err
            )
        })?;
        fs::rename(&backup_db_dir, &active_db_dir).map_err(|err| {
            format!(
                "dbCache を復元できません ({}): {}",
                backup_db_dir.display(),
                err
            )
        })?;
    }

    if backup_slot_dir.exists() {
        if let Err(err) = fs::remove_dir_all(&backup_slot_dir) {
            crate::utils::log_warn(&format!(
                "復元後の一時バックアップ フォルダを削除できません [{}]: {}",
                backup_slot_dir.display(),
                err
            ));
        }
    }
    if backup_dir.exists() {
        let slot_entries_remaining = fs::read_dir(&backup_dir)
            .ok()
            .and_then(|mut entries| entries.next())
            .is_some();
        if !slot_entries_remaining {
            if let Err(err) = fs::remove_dir_all(&backup_dir) {
                crate::utils::log_warn(&format!(
                    "空のバックアップ ルートを削除できません [{}]: {}",
                    backup_dir.display(),
                    err
                ));
            }
        }
    }

    let mut entries = load_backup_paths();
    entries.retain(|entry| entry.photo_folder_path != normalized);
    save_backup_paths(&entries)?;
    Ok(true)
}

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
        crate::utils::log_warn(&format!("photo cache VACUUM failed: {}", err));
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

pub fn reset_photo_cache_for_slot(source_slot: i64) -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    let tx = conn.unchecked_transaction().map_err(|err| {
        format!(
            "写真キャッシュ削除トランザクションを開始できません [slot={}]: {}",
            source_slot, err
        )
    })?;

    tx.execute(
        "DELETE FROM photo_tags
         WHERE photo_path IN (
             SELECT photo_path
             FROM photos
             WHERE source_slot = ?1
         )",
        rusqlite::params![source_slot],
    )
    .map_err(|err| format!("photo_tags を削除できません [slot={}]: {}", source_slot, err))?;

    tx.execute(
        "DELETE FROM photos WHERE source_slot = ?1",
        rusqlite::params![source_slot],
    )
    .map_err(|err| format!("photos を削除できません [slot={}]: {}", source_slot, err))?;

    tx.commit()
        .map_err(|err| format!("写真キャッシュ削除を確定できません [slot={}]: {}", source_slot, err))?;

    if let Some(img_cache_dir) = get_alpheratz_img_cache_dir(source_slot) {
        clear_directory_contents(&img_cache_dir).map_err(|err| {
            format!(
                "imgCache のリセットに失敗しました [{}]: {}",
                img_cache_dir.display(),
                err
            )
        })?;
    }

    Ok(())
}
