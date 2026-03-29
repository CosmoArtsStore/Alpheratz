use std::collections::HashSet;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;

use pdqhash::generate_pdq;
use pdqhash::image::{self, DynamicImage};
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::open_alpheratz_connection;
use crate::models::ScanProgress;
use crate::utils;

const PHASH_BATCH_SIZE: usize = 256;
pub const PHASH_VERSION: i64 = 2;
pub const PDQ_GROUP_VERSION: i64 = 1;
const PHASH_UPDATE_BATCH_SIZE: usize = 32;
const PHASH_PROGRESS_EMIT_INTERVAL: usize = 16;
const PDQ_GROUP_MAX_DISTANCE: u32 = 72;

#[derive(Clone, Copy)]
enum PdqScope {
    All,
    UnknownWorldOnly,
}

pub struct PHashWorkerState {
    pub running: AtomicBool,
    pub progress: Mutex<PHashProgressPayload>,
}

#[derive(Clone, Debug, Serialize, Default)]
pub struct PHashProgressPayload {
    pub done: usize,
    pub total: usize,
    pub current: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PHashWorldMatch {
    pub world_name: String,
    pub similarity: f32,
}

#[derive(Clone, Debug)]
struct PdqComputeResult {
    source_slot: i64,
    path: String,
    filename: String,
    hash: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Debug)]
struct PdqGroupingCandidate {
    photo_path: String,
    source_slot: i64,
    world_name: Option<String>,
    orientation: Option<String>,
    variants: Vec<String>,
}

pub fn start_phash_worker(app: AppHandle) {
    let state = app.state::<PHashWorkerState>();
    if state.running.swap(true, Ordering::SeqCst) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(err) = run_phash_worker(app.clone(), 0, 0, PdqScope::All).await {
            crate::utils::log_err(&format!("pHash worker failed: {}", err));
        }

        let state = app.state::<PHashWorkerState>();
        state.running.store(false, Ordering::SeqCst);
        if let Ok(mut progress) = state.progress.lock() {
            progress.current = None;
        }
        emit_event(&app, "phash_complete", ());
    });
}

pub fn start_unknown_world_pdq_worker(app: AppHandle) {
    let state = app.state::<PHashWorkerState>();
    if state.running.swap(true, Ordering::SeqCst) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(err) = run_phash_worker(app.clone(), 0, 0, PdqScope::UnknownWorldOnly).await {
            crate::utils::log_err(&format!("unknown-world PDQ worker failed: {}", err));
        } else {
            update_progress(&app, 0, 0, Some("類似候補を一括分析中...".to_string()));
            emit_event(&app, "phash_progress", get_phash_progress(&app));
            if let Err(err) = crate::db::refresh_unknown_world_similar_candidate_cache(24) {
                crate::utils::log_err(&format!("unknown-world similar cache refresh failed: {}", err));
            }
        }

        let state = app.state::<PHashWorkerState>();
        state.running.store(false, Ordering::SeqCst);
        if let Ok(mut progress) = state.progress.lock() {
            progress.current = None;
        }
        emit_event(&app, "phash_complete", ());
    });
}

pub async fn run_pending_phash_for_scan(
    app: AppHandle,
    processed_base: usize,
    total_work: usize,
) -> Result<(), String> {
    let state = app.state::<PHashWorkerState>();
    if state.running.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let result = run_phash_worker(app.clone(), processed_base, total_work, PdqScope::All).await;

    let state = app.state::<PHashWorkerState>();
    state.running.store(false, Ordering::SeqCst);
    if let Ok(mut progress) = state.progress.lock() {
        progress.current = None;
    }
    emit_event(&app, "phash_complete", ());

    result
}

pub fn get_phash_progress(app: &AppHandle) -> PHashProgressPayload {
    let state = app.state::<PHashWorkerState>();
    let progress = match state.progress.lock() {
        Ok(progress) => progress.clone(),
        Err(err) => {
            crate::utils::log_warn(&format!("PDQ 進捗状態を読み取れませんでした: {}", err));
            PHashProgressPayload::default()
        }
    };
    progress
}

fn emit_scan_progress(
    app: &AppHandle,
    done: usize,
    total: usize,
    current: Option<String>,
    processed_base: usize,
    total_work: usize,
) {
    let payload = ScanProgress {
        processed: processed_base + done,
        total: total_work.max(processed_base + total),
        current_world: current.unwrap_or_else(|| "pHash を計算中...".to_string()),
        phase: "scan".to_string(),
    };
    if let Err(err) = app.emit("scan:progress", payload) {
        crate::utils::log_warn(&format!("emit failed [scan:progress]: {}", err));
    }
}

pub fn count_pending_phash_for_scan() -> Result<usize, String> {
    count_pending_phash(PdqScope::All)
}

pub fn has_pending_phash() -> Result<bool, String> {
    let conn = open_alpheratz_connection(1)?;
    let count = conn
        .query_row(
            "SELECT COUNT(*) FROM photos
             WHERE is_missing = 0
               AND (
                 phash IS NULL
                 OR phash = ''
                 OR COALESCE(phash_version, 0) != ?1
               )",
            [PHASH_VERSION],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|err| format!("未計算の PDQ 件数を取得できません: {}", err))?;
    Ok(count > 0)
}

pub fn has_unknown_worlds() -> Result<bool, String> {
    Ok(false)
}

pub fn infer_world_name_from_unknown_photo(
    _path: &Path,
) -> Result<Option<PHashWorldMatch>, String> {
    Ok(None)
}

async fn run_phash_worker(
    app: AppHandle,
    processed_base: usize,
    total_work: usize,
    scope: PdqScope,
) -> Result<(), String> {
    let mut total = tauri::async_runtime::spawn_blocking(move || count_pending_phash(scope))
        .await
        .map_err(|err| format!("PDQ 件数取得タスクの join に失敗しました: {}", err))??;

    update_progress(&app, 0, total, None);
    emit_scan_progress(&app, 0, total, None, processed_base, total_work);
    if total > 0 {
        let mut done = 0usize;
        let mut attempted_paths = HashSet::new();

        loop {
            let batch = tauri::async_runtime::spawn_blocking(move || fetch_pending_batch(scope))
                .await
                .map_err(|err| format!("PDQ 対象取得タスクの join に失敗しました: {}", err))??;

            let mut pending_batch = Vec::with_capacity(batch.len());
            for item in batch {
                if attempted_paths.contains(&item.2) {
                    continue;
                }
                attempted_paths.insert(item.2.clone());
                pending_batch.push(item);
            }

            if pending_batch.is_empty() {
                break;
            }

            if done + pending_batch.len() > total {
                total = done + pending_batch.len();
                update_progress(&app, done, total, None);
                emit_scan_progress(&app, done, total, None, processed_base, total_work);
                emit_event(&app, "phash_progress", get_phash_progress(&app));
            }

            let batch_results =
                tauri::async_runtime::spawn_blocking(move || compute_pdq_batch(pending_batch))
                    .await
                    .map_err(|err| {
                        format!("PDQ バッチ計算タスクの join に失敗しました: {}", err)
                    })??;

            let conn = open_alpheratz_connection(1)?;
            for chunk in batch_results.chunks(PHASH_UPDATE_BATCH_SIZE) {
                apply_pdq_updates(&conn, chunk)?;

                for result in chunk {
                    done += 1;
                    if let Some(err) = &result.error {
                        crate::utils::log_warn(&format!(
                            "PDQ skipped [{}]: {}",
                            result.filename, err
                        ));
                    }

                    update_progress(&app, done, total, Some(result.filename.clone()));
                    emit_scan_progress(
                        &app,
                        done,
                        total,
                        Some(result.filename.clone()),
                        processed_base,
                        total_work,
                    );
                    if done % PHASH_PROGRESS_EMIT_INTERVAL == 0 || done == total {
                        emit_event(&app, "phash_progress", get_phash_progress(&app));
                    }
                }
            }
        }
    }

    rebuild_pdq_groups()?;

    Ok(())
}

fn count_pending_phash(scope: PdqScope) -> Result<usize, String> {
    let conn = open_alpheratz_connection(1)?;
    let unknown_world_filter = match scope {
        PdqScope::All => "",
        PdqScope::UnknownWorldOnly => " AND (world_name IS NULL OR TRIM(world_name) = '')",
    };
    let sql = format!(
        "SELECT COUNT(*) FROM photos
         WHERE is_missing = 0
           AND (
             phash IS NULL
             OR phash = ''
             OR COALESCE(phash_version, 0) != ?1
           ){}",
        unknown_world_filter
    );
    let count = conn
        .query_row(&sql, [PHASH_VERSION], |row| row.get::<_, i64>(0))
        .map_err(|err| format!("未計算の PDQ 件数を取得できません [{}]: {}", sql, err))?;
    Ok(count.max(0) as usize)
}

fn fetch_pending_batch(scope: PdqScope) -> Result<Vec<(i64, String, String)>, String> {
    let conn = open_alpheratz_connection(1)?;
    let unknown_world_filter = match scope {
        PdqScope::All => "",
        PdqScope::UnknownWorldOnly => " AND (world_name IS NULL OR TRIM(world_name) = '')",
    };
    let sql = format!(
        "SELECT source_slot, photo_filename, photo_path
         FROM photos
         WHERE is_missing = 0
           AND (
             phash IS NULL
             OR phash = ''
             OR COALESCE(phash_version, 0) != ?1
           ){}
         ORDER BY timestamp DESC
         LIMIT ?2",
        unknown_world_filter
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|err| format!("PDQ 対象クエリを準備できません [{}]: {}", sql, err))?;
    let rows = stmt
        .query_map(
            rusqlite::params![PHASH_VERSION, PHASH_BATCH_SIZE as i64],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .map_err(|err| format!("PDQ 対象を読み出せません: {}", err))?;

    let mut batch = Vec::new();
    for row in rows {
        match row {
            Ok(item) => batch.push(item),
            Err(err) => crate::utils::log_warn(&format!("PDQ target row decode failed: {}", err)),
        }
    }
    Ok(batch)
}

fn compute_pdq_batch(batch: Vec<(i64, String, String)>) -> Result<Vec<PdqComputeResult>, String> {
    if batch.is_empty() {
        return Ok(Vec::new());
    }

    let worker_limit = std::thread::available_parallelism()
        .map(|value| value.get().clamp(4, 16))
        .unwrap_or(8);
    let worker_count = worker_limit.min(batch.len()).max(1);
    let chunk_size = batch.len().div_ceil(worker_count);
    let mut handles = Vec::with_capacity(worker_count);

    for chunk in batch.chunks(chunk_size) {
        let owned_chunk = chunk.to_vec();
        handles.push(thread::spawn(move || {
            owned_chunk
                .into_iter()
                .map(|(source_slot, filename, path)| {
                    match compute_pdq_variants_from_path(&path, source_slot) {
                        Ok(hash) => PdqComputeResult {
                            source_slot,
                            path,
                            filename,
                            hash: Some(hash),
                            error: None,
                        },
                        Err(err) => PdqComputeResult {
                            source_slot,
                            path,
                            filename,
                            hash: None,
                            error: Some(err),
                        },
                    }
                })
                .collect::<Vec<PdqComputeResult>>()
        }));
    }

    let mut results = Vec::with_capacity(batch.len());
    for handle in handles {
        let mut chunk_results = handle
            .join()
            .map_err(|_| "PDQ ワーカースレッドが panic しました".to_string())?;
        results.append(&mut chunk_results);
    }
    Ok(results)
}

fn apply_pdq_updates(conn: &Connection, results: &[PdqComputeResult]) -> Result<(), String> {
    let tx = conn
        .unchecked_transaction()
        .map_err(|err| format!("PDQ 更新トランザクションを開始できません: {}", err))?;

    {
        let mut stmt = tx
            .prepare(
                "UPDATE photos
                 SET phash = ?1,
                     phash_version = ?2
                 WHERE photo_path = ?3
                   AND source_slot = ?4",
            )
            .map_err(|err| format!("PDQ 更新ステートメントを準備できません: {}", err))?;

        for result in results {
            let Some(hash) = &result.hash else {
                continue;
            };

            stmt.execute(rusqlite::params![
                hash,
                PHASH_VERSION,
                result.path,
                result.source_slot
            ])
            .map_err(|err| format!("PDQ を更新できません [{}]: {}", result.path, err))?;
        }
    }

    tx.commit()
        .map_err(|err| format!("PDQ 更新トランザクションを確定できません: {}", err))?;
    Ok(())
}

fn update_progress(app: &AppHandle, done: usize, total: usize, current: Option<String>) {
    let state = app.state::<PHashWorkerState>();
    match state.progress.lock() {
        Ok(mut progress) => {
            progress.done = done;
            progress.total = total;
            progress.current = current;
        }
        Err(err) => {
            crate::utils::log_warn(&format!("PDQ 進捗状態を更新できませんでした: {}", err));
        }
    };
}

fn emit_event<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: T) {
    if let Err(err) = app.emit(event, payload) {
        crate::utils::log_warn(&format!("emit failed [{}]: {}", event, err));
    }
}

pub fn compute_pdq_variants_from_path(path: &str, source_slot: i64) -> Result<String, String> {
    let thumb_path = utils::create_thumbnail_file(path, source_slot)?;
    let image = image::open(&thumb_path)
        .map_err(|err| format!("PDQ 用サムネイルを開けません [{}]: {}", thumb_path, err))?;
    Ok(compute_pdq_variants(&image)?.join("|"))
}

pub fn rebuild_pdq_groups() -> Result<(), String> {
    let conn = open_alpheratz_connection(1)?;
    let candidates = fetch_grouping_candidates(&conn)?;
    if candidates.is_empty() {
        conn.execute(
            "UPDATE photos
             SET pdq_group_id = photo_path,
                 pdq_group_version = ?1
             WHERE is_missing = 0",
            [PDQ_GROUP_VERSION],
        )
        .map_err(|err| format!("空の PDQ grouped 情報を更新できません: {}", err))?;
        return Ok(());
    }

    let mut union_find = UnionFind::new(candidates.len());

    for left_index in 0..candidates.len() {
        for right_index in (left_index + 1)..candidates.len() {
            if !can_group_candidates(&candidates[left_index], &candidates[right_index]) {
                continue;
            }

            let distance = get_closest_hash_distance(
                &candidates[left_index].variants,
                &candidates[right_index].variants,
            );

            if distance.is_some_and(|value| value <= PDQ_GROUP_MAX_DISTANCE) {
                union_find.union(left_index, right_index);
            }
        }
    }

    let mut group_leaders = HashMap::new();
    let mut updates = Vec::with_capacity(candidates.len());
    for (index, candidate) in candidates.iter().enumerate() {
        let root = union_find.find(index);
        let group_id = group_leaders
            .entry(root)
            .or_insert_with(|| candidate.photo_path.clone())
            .clone();
        updates.push((candidate.photo_path.clone(), group_id));
    }

    apply_pdq_group_updates(&conn, &updates)
}

fn fetch_grouping_candidates(conn: &Connection) -> Result<Vec<PdqGroupingCandidate>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT photo_path, source_slot, world_name, orientation, phash
             FROM photos
             WHERE is_missing = 0",
        )
        .map_err(|err| format!("PDQ grouped 対象クエリを準備できません: {}", err))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|err| format!("PDQ grouped 対象を読み出せません: {}", err))?;

    let mut candidates = Vec::new();
    for row in rows {
        match row {
            Ok((photo_path, source_slot, world_name, orientation, phash)) => {
                candidates.push(PdqGroupingCandidate {
                    photo_path,
                    source_slot,
                    world_name,
                    orientation,
                    variants: parse_pdq_variants(phash.as_deref()),
                });
            }
            Err(err) => crate::utils::log_warn(&format!("PDQ grouped target row decode failed: {}", err)),
        }
    }
    Ok(candidates)
}

fn apply_pdq_group_updates(
    conn: &Connection,
    updates: &[(String, String)],
) -> Result<(), String> {
    let tx = conn
        .unchecked_transaction()
        .map_err(|err| format!("PDQ grouped 更新トランザクションを開始できません: {}", err))?;
    {
        let mut stmt = tx
            .prepare(
                "UPDATE photos
                 SET pdq_group_id = ?1,
                     pdq_group_version = ?2
                 WHERE photo_path = ?3",
            )
            .map_err(|err| format!("PDQ grouped 更新ステートメントを準備できません: {}", err))?;

        for (photo_path, group_id) in updates {
            stmt.execute(rusqlite::params![group_id, PDQ_GROUP_VERSION, photo_path])
                .map_err(|err| format!("PDQ grouped を更新できません [{}]: {}", photo_path, err))?;
        }
    }
    tx.commit()
        .map_err(|err| format!("PDQ grouped 更新トランザクションを確定できません: {}", err))?;
    Ok(())
}

pub fn parse_pdq_variants(value: Option<&str>) -> Vec<String> {
    value
        .unwrap_or_default()
        .split('|')
        .map(|item| item.trim().to_ascii_lowercase())
        .filter(|item| item.len() == 64 && item.chars().all(|ch| ch.is_ascii_hexdigit()))
        .collect()
}

fn normalize_world_name(value: Option<&str>) -> String {
    value.unwrap_or_default().trim().to_lowercase()
}

fn can_group_candidates(left: &PdqGroupingCandidate, right: &PdqGroupingCandidate) -> bool {
    if left.source_slot != right.source_slot {
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

    let left_world = normalize_world_name(left.world_name.as_deref());
    let right_world = normalize_world_name(right.world_name.as_deref());
    if !left_world.is_empty() && !right_world.is_empty() && left_world != right_world {
        return false;
    }

    !left.variants.is_empty() && !right.variants.is_empty()
}

pub fn get_closest_hash_distance(left: &[String], right: &[String]) -> Option<u32> {
    if left.is_empty() || right.is_empty() {
        return None;
    }

    let mut best = u32::MAX;
    for left_hash in left {
        for right_hash in right {
            let distance = get_hamming_distance(left_hash, right_hash);
            if distance < best {
                best = distance;
            }
            if best == 0 {
                return Some(0);
            }
        }
    }

    if best == u32::MAX { None } else { Some(best) }
}

fn get_hamming_distance(left: &str, right: &str) -> u32 {
    left.bytes()
        .zip(right.bytes())
        .map(|(left_byte, right_byte)| {
            let left_value = (left_byte as char).to_digit(16).unwrap_or(0);
            let right_value = (right_byte as char).to_digit(16).unwrap_or(0);
            (left_value ^ right_value).count_ones()
        })
        .sum()
}

struct UnionFind {
    parent: Vec<usize>,
}

impl UnionFind {
    fn new(size: usize) -> Self {
        Self {
            parent: (0..size).collect(),
        }
    }

    fn find(&mut self, index: usize) -> usize {
        if self.parent[index] != index {
            let root = self.find(self.parent[index]);
            self.parent[index] = root;
        }
        self.parent[index]
    }

    fn union(&mut self, left: usize, right: usize) {
        let left_root = self.find(left);
        let right_root = self.find(right);
        if left_root != right_root {
            self.parent[right_root] = left_root;
        }
    }
}

fn compute_pdq_variants(image: &DynamicImage) -> Result<[String; 4], String> {
    Ok([
        compute_pdq_hash(image)?,
        compute_pdq_hash(&image.rotate90())?,
        compute_pdq_hash(&image.rotate180())?,
        compute_pdq_hash(&image.rotate270())?,
    ])
}

fn compute_pdq_hash(image: &DynamicImage) -> Result<String, String> {
    let Some((hash, _quality)) = generate_pdq(image) else {
        return Err("PDQ ハッシュを計算できませんでした".to_string());
    };
    Ok(hash
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>())
}
