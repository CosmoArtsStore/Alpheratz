use chrono::Local;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

const REGISTRY_BASE_KEY: &str = "Software\\CosmoArtsStore\\STELLAProject";
const LOG_FILE_PREFIX: &str = "info";

fn write_bootstrap_stderr(message: &str) {
    // Intentional: 起動前ログの保存先自体が使えない場合だけ、stderr を最後の退避先にする。
    eprintln!("{message}");
}

fn write_bootstrap_log(level: &str, msg: &str) {
    let fallback_dir = std::env::temp_dir().join("STELLAProject").join("Alpheratz");
    if let Err(err) = fs::create_dir_all(&fallback_dir) {
        write_bootstrap_stderr(&format!(
            "[Alpheratz][WARN] 起動前ログディレクトリを作成できませんでした [{}]: {}",
            fallback_dir.display(),
            err
        ));
        return;
    }

    let month = Local::now().format("%Y%m");
    let path = fallback_dir.join(format!("{LOG_FILE_PREFIX}_{month}.log"));
    match OpenOptions::new().create(true).append(true).open(&path) {
        Ok(mut file) => {
            let now = Local::now().format("%Y-%m-%d %H:%M:%S");
            if let Err(err) = writeln!(file, "[{}] [{}] {}", now, level, msg) {
                write_bootstrap_stderr(&format!(
                    "[Alpheratz][WARN] 起動前ログを書き込めませんでした [{}]: {}",
                    path.display(),
                    err
                ));
            }
        }
        Err(err) => {
            write_bootstrap_stderr(&format!(
                "[Alpheratz][WARN] 起動前ログを開けませんでした [{}]: {}",
                path.display(),
                err
            ));
        }
    }
}

fn get_monthly_log_path(base_dir: &Path) -> PathBuf {
    let month = Local::now().format("%Y%m");
    base_dir.join(format!("{LOG_FILE_PREFIX}_{month}.log"))
}

// 共通レジストリからアプリのインストール先を解決する。
pub fn get_component_install_dir(component_name: &str) -> Option<PathBuf> {
    let key_path = format!("{}\\{}", REGISTRY_BASE_KEY, component_name);
    let key = match RegKey::predef(HKEY_CURRENT_USER).open_subkey(&key_path) {
        Ok(key) => key,
        Err(err) => {
            write_bootstrap_log(
                "WARN",
                &format!("レジストリキーを開けませんでした [{}]: {}", key_path, err),
            );
            return None;
        }
    };

    let path: String = match key.get_value("InstallLocation") {
        Ok(path) => path,
        Err(err) => {
            write_bootstrap_log(
                "WARN",
                &format!(
                    "レジストリ値を読み取れませんでした [{}\\InstallLocation]: {}",
                    key_path, err
                ),
            );
            return None;
        }
    };

    let path_buf = PathBuf::from(path);
    if path_buf.exists() {
        Some(path_buf)
    } else {
        write_bootstrap_log(
            "WARN",
            &format!("インストール先が存在しません: {}", path_buf.display()),
        );
        None
    }
}

// Alpheratz のインストール先を返す。
pub fn get_alpheratz_install_dir() -> Option<PathBuf> {
    get_component_install_dir("Alpheratz")
}

// Alpheratz の data ディレクトリを用意して返す。
pub fn get_alpheratz_data_dir() -> Option<PathBuf> {
    let data_dir = get_alpheratz_install_dir()?.join("data");
    if let Err(err) = fs::create_dir_all(&data_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "data ディレクトリを作成できませんでした [{}]: {}",
                data_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(data_dir)
}

// Alpheratz の log ディレクトリを用意して返す。
pub fn get_alpheratz_log_dir() -> Option<PathBuf> {
    let log_dir = get_alpheratz_data_dir()?.join("log");
    if let Err(err) = fs::create_dir_all(&log_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "log ディレクトリを作成できませんでした [{}]: {}",
                log_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(log_dir)
}

// Alpheratz の cache ルートを用意して返す。
pub fn get_alpheratz_cache_dir() -> Option<PathBuf> {
    let cache_dir = get_alpheratz_data_dir()?.join("cache");
    if let Err(err) = fs::create_dir_all(&cache_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "cache ディレクトリを作成できませんでした [{}]: {}",
                cache_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(cache_dir)
}

fn slot_cache_folder_name(source_slot: i64) -> &'static str {
    if source_slot == 2 {
        "2nd-cache"
    } else {
        "1st-cache"
    }
}

// 指定スロットの cache ディレクトリを用意して返す。
pub fn get_alpheratz_slot_cache_dir(source_slot: i64) -> Option<PathBuf> {
    let slot_cache_dir = get_alpheratz_cache_dir()?.join(slot_cache_folder_name(source_slot));
    if let Err(err) = fs::create_dir_all(&slot_cache_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "スロット別 cache ディレクトリを作成できませんでした [{}]: {}",
                slot_cache_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(slot_cache_dir)
}

// 設定ファイル用ディレクトリを用意して返す。
pub fn get_alpheratz_setting_dir() -> Option<PathBuf> {
    let setting_dir = get_alpheratz_data_dir()?.join("setting");
    if let Err(err) = fs::create_dir_all(&setting_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "setting ディレクトリを作成できませんでした [{}]: {}",
                setting_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(setting_dir)
}

// backup ルートディレクトリを用意して返す。
pub fn get_alpheratz_backup_dir() -> Option<PathBuf> {
    let backup_dir = get_alpheratz_cache_dir()?.join("backup");
    if let Err(err) = fs::create_dir_all(&backup_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "backup ディレクトリを作成できませんでした [{}]: {}",
                backup_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(backup_dir)
}

// DB backup ディレクトリを用意して返す。
pub fn get_alpheratz_db_backup_dir() -> Option<PathBuf> {
    let backup_dir = get_alpheratz_backup_dir()?.join("dbcache");
    if let Err(err) = fs::create_dir_all(&backup_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "db backup ディレクトリを作成できませんでした [{}]: {}",
                backup_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(backup_dir)
}

// DB cache ディレクトリを用意して返す。
pub fn get_alpheratz_db_cache_dir(_source_slot: i64) -> Option<PathBuf> {
    let db_cache_dir = get_alpheratz_cache_dir()?
        .join("shared-cache")
        .join("dbCache");
    if let Err(err) = fs::create_dir_all(&db_cache_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "db cache ディレクトリを作成できませんでした [{}]: {}",
                db_cache_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(db_cache_dir)
}

// 指定スロットの画像 cache ディレクトリを用意して返す。
pub fn get_alpheratz_img_cache_dir(source_slot: i64) -> Option<PathBuf> {
    let img_cache_dir = get_alpheratz_slot_cache_dir(source_slot)?.join("imgCache");
    if let Err(err) = fs::create_dir_all(&img_cache_dir) {
        write_bootstrap_log(
            "WARN",
            &format!(
                "img cache ディレクトリを作成できませんでした [{}]: {}",
                img_cache_dir.display(),
                err
            ),
        );
        return None;
    }
    Some(img_cache_dir)
}

// 指定ディレクトリ配下の内容をすべて削除する。
pub fn clear_directory_contents(dir: &Path) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(dir).map_err(|err| {
        format!(
            "ディレクトリを読み取れませんでした [{}]: {}",
            dir.display(),
            err
        )
    })?;

    for entry in entries {
        let entry = entry.map_err(|err| {
            format!(
                "ディレクトリエントリを読み取れませんでした [{}]: {}",
                dir.display(),
                err
            )
        })?;
        let path = entry.path();
        if path.is_dir() {
            fs::remove_dir_all(&path).map_err(|err| {
                format!(
                    "ディレクトリを削除できませんでした [{}]: {}",
                    path.display(),
                    err
                )
            })?;
        } else {
            fs::remove_file(&path).map_err(|err| {
                format!(
                    "ファイルを削除できませんでした [{}]: {}",
                    path.display(),
                    err
                )
            })?;
        }
    }

    Ok(())
}

// Polaris のインストール先を返す。
pub fn get_polaris_install_dir() -> Option<PathBuf> {
    get_component_install_dir("Polaris")
}

// 月別ログへ 1 行追記する。
pub fn log_msg(level: &str, msg: &str) {
    if let Some(log_dir) = get_alpheratz_log_dir() {
        let path = get_monthly_log_path(&log_dir);
        match OpenOptions::new().create(true).append(true).open(&path) {
            Ok(mut file) => {
                let now = Local::now().format("%Y-%m-%d %H:%M:%S");
                if let Err(err) = writeln!(file, "[{}] [{}] {}", now, level, msg) {
                    write_bootstrap_log(
                        "WARN",
                        &format!("ログを書き込めませんでした [{}]: {}", path.display(), err),
                    );
                }
            }
            Err(err) => {
                write_bootstrap_log(
                    "WARN",
                    &format!("ログを開けませんでした [{}]: {}", path.display(), err),
                );
            }
        }
    } else {
        write_bootstrap_log(level, msg);
    }
}

// WARN ログを記録する。
pub fn log_warn(msg: &str) {
    log_msg("WARN", msg);
}

// ERROR ログを記録する。
pub fn log_err(msg: &str) {
    log_msg("ERROR", msg);
}

// 旧配置のサムネイル cache ディレクトリを用意して返す。
pub fn get_thumbnail_cache_dir() -> Result<PathBuf, String> {
    let install_dir = get_alpheratz_install_dir()
        .ok_or_else(|| "Alpheratz のインストール先を取得できません".to_string())?;
    let cache_dir = install_dir.join("cache");
    fs::create_dir_all(&cache_dir).map_err(|e| {
        format!(
            "サムネイルキャッシュフォルダを作成できません ({}): {}",
            cache_dir.display(),
            e
        )
    })?;
    Ok(cache_dir)
}

fn create_thumbnail_file_with_size(
    path: &str,
    source_slot: i64,
    size: u32,
    cache_version: &str,
) -> Result<String, String> {
    let cache_dir = get_alpheratz_img_cache_dir(source_slot)
        .ok_or_else(|| "Alpheratz の imgCache フォルダを取得できません".to_string())?;
    let path_p = Path::new(path);
    let filename = path_p
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| format!("サムネイル対象のファイル名を解決できません: {}", path))?;
    let cache_path = cache_dir.join(format!("{}.thumb.{}.jpg", filename, cache_version));

    if cache_path.exists() {
        return Ok(cache_path.to_string_lossy().to_string());
    }

    let img =
        image::open(path).map_err(|e| format!("サムネイル用画像を開けません ({}): {}", path, e))?;
    let thumb = img.thumbnail(size, size);
    thumb.save(&cache_path).map_err(|e| {
        format!(
            "サムネイルを保存できません ({}): {}",
            cache_path.display(),
            e
        )
    })?;

    Ok(cache_path.to_string_lossy().to_string())
}

// 標準サイズのサムネイルを生成または再利用する。
pub fn create_thumbnail_file(path: &str, source_slot: i64) -> Result<String, String> {
    create_thumbnail_file_with_size(path, source_slot, 192, "pdq.v1")
}

// 詳細表示用の大きいサムネイルを生成または再利用する。
pub fn create_display_thumbnail_file(path: &str, source_slot: i64) -> Result<String, String> {
    create_thumbnail_file_with_size(path, source_slot, 514, "display.v2")
}

// ギャラリー表示用の中サイズサムネイルを生成または再利用する。
pub fn create_grid_thumbnail_file(path: &str, source_slot: i64) -> Result<String, String> {
    create_thumbnail_file_with_size(path, source_slot, 384, "grid.v2")
}

// 複数写真を指定先ディレクトリへまとめてコピーする。
pub fn copy_photo_files(photo_paths: &[String], destination_dir: &str) -> Result<usize, String> {
    let destination_path = Path::new(destination_dir);
    if !destination_path.exists() {
        return Err(format!(
            "コピー先フォルダが見つかりません: {}",
            destination_path.display()
        ));
    }
    if !destination_path.is_dir() {
        return Err(format!(
            "コピー先がフォルダではありません: {}",
            destination_path.display()
        ));
    }

    let mut copied_count = 0usize;

    for photo_path in photo_paths {
        let source_path = Path::new(photo_path);
        if !source_path.exists() {
            return Err(format!(
                "コピー元ファイルが見つかりません: {}",
                source_path.display()
            ));
        }

        let file_name = source_path.file_name().ok_or_else(|| {
            format!(
                "コピー元ファイル名を解決できません: {}",
                source_path.display()
            )
        })?;
        let destination_file = unique_copy_target(destination_path, file_name);
        fs::copy(source_path, &destination_file).map_err(|err| {
            format!(
                "ファイルをコピーできません [{} -> {}]: {}",
                source_path.display(),
                destination_file.display(),
                err
            )
        })?;
        copied_count += 1;
    }

    Ok(copied_count)
}

fn unique_copy_target(destination_dir: &Path, file_name: &std::ffi::OsStr) -> PathBuf {
    let initial_target = destination_dir.join(file_name);
    if !initial_target.exists() {
        return initial_target;
    }

    let stem = Path::new(file_name)
        .file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "copy".to_string());
    let extension = Path::new(file_name)
        .extension()
        .map(|value| value.to_string_lossy().to_string());

    let mut index = 1usize;
    loop {
        let candidate_name = match &extension {
            Some(extension) if !extension.is_empty() => format!("{stem}_{index}.{extension}"),
            _ => format!("{stem}_{index}"),
        };
        let candidate = destination_dir.join(candidate_name);
        if !candidate.exists() {
            return candidate;
        }
        index += 1;
    }
}

// Windows ログイン時起動の登録状態を切り替える。
pub fn set_startup_enabled(value_name: &str, enabled: bool) -> Result<(), String> {
    let run_key = RegKey::predef(HKEY_CURRENT_USER)
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|err| format!("自動起動レジストリを開けませんでした: {err}"))?
        .0;

    if enabled {
        let executable = std::env::current_exe()
            .map_err(|err| format!("実行ファイルパスを取得できませんでした: {err}"))?;
        let command = format!("\"{}\"", executable.display());
        run_key
            .set_value(value_name, &command)
            .map_err(|err| format!("自動起動を登録できませんでした: {err}"))?;
    } else if let Err(err) = run_key.delete_value(value_name) {
        if err.kind() != std::io::ErrorKind::NotFound {
            return Err(format!("自動起動を解除できませんでした: {err}"));
        }
    }

    Ok(())
}
