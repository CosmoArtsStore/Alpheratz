import { invoke } from '@tauri-apps/api/core';
import type { AppSetting, BackupCandidate } from '../models/types';

// Loads the persisted application settings from Rust.
export const loadAppSetting = () => invoke<AppSetting>('get_setting_cmd');

// Saves the full settings object to the Rust configuration layer.
export const saveAppSetting = (setting: AppSetting) => invoke('save_setting_cmd', { setting });

// Saves only the startup preference after the user has explicitly chosen it.
export const saveStartupPreference = (enabled: boolean) =>
  invoke('save_startup_preference_cmd', { enabled });

// Loads every known tag so the settings screen can manage tag masters.
export const loadAllTags = () => invoke<string[]>('get_all_tags_cmd');

// Creates a new tag master record.
export const createTagMaster = (tag: string) => invoke('create_tag_master_cmd', { tag });

// Deletes a tag master record.
export const deleteTagMaster = (tag: string) => invoke('delete_tag_master_cmd', { tag });

// Creates a backup of the cache database associated with a photo folder.
export const createCacheBackup = (photoFolderPath: string) =>
  invoke('create_cache_backup_cmd', { photoFolderPath });

// Restores the latest cache backup for a photo folder.
export const restoreCacheBackup = (photoFolderPath: string) =>
  invoke('restore_cache_backup_cmd', { photoFolderPath });

// Resets the photo cache database contents.
export const resetPhotoCache = () => invoke('reset_photo_cache_cmd');

// Loads the latest backup candidate metadata for the current photo folder.
export const loadBackupCandidate = (photoFolderPath: string) =>
  invoke<BackupCandidate | null>('get_backup_candidate_cmd', { photoFolderPath });

// Resolves unknown-world photos from the archived Polaris logs.
export const resolveUnknownWorldsFromArchive = () =>
  invoke<number>('resolve_unknown_worlds_from_archive_cmd');

// Resolves unknown-world photos from already known similar photos.
export const resolveUnknownWorldsFromSimilarPhotos = () =>
  invoke<number>('resolve_unknown_worlds_from_similar_photos_cmd');
