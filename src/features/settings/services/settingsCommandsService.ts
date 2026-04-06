import { invoke } from '@tauri-apps/api/core';
import type { AppSetting, BackupCandidate } from '../models/types';

export const loadAppSetting = () => invoke<AppSetting>('get_setting_cmd');

export const saveAppSetting = (setting: AppSetting) => invoke('save_setting_cmd', { setting });

export const saveStartupPreference = (enabled: boolean) =>
  invoke('save_startup_preference_cmd', { enabled });

export const loadAllTags = () => invoke<string[]>('get_all_tags_cmd');

export const createTagMaster = (tag: string) => invoke('create_tag_master_cmd', { tag });

export const deleteTagMaster = (tag: string) => invoke('delete_tag_master_cmd', { tag });

export const createCacheBackup = (photoFolderPath: string) =>
  invoke('create_cache_backup_cmd', { photoFolderPath });

export const restoreCacheBackup = (photoFolderPath: string) =>
  invoke('restore_cache_backup_cmd', { photoFolderPath });

export const resetPhotoCache = () => invoke('reset_photo_cache_cmd');

export const loadBackupCandidate = (photoFolderPath: string) =>
  invoke<BackupCandidate | null>('get_backup_candidate_cmd', { photoFolderPath });
