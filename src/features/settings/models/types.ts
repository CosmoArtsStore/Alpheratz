import type { ThemeMode, ViewMode } from '../../../shared/models/types';

// Persisted frontend settings mirrored to the Rust configuration layer.
export interface AppSetting {
  photoFolderPath?: string;
  secondaryPhotoFolderPath?: string;
  enableStartup?: boolean;
  startupPreferenceSet?: boolean;
  themeMode?: ThemeMode;
  viewMode?: ViewMode;
  tweetTemplates?: string[];
  activeTweetTemplate?: string;
}

// Existing cache backup metadata shown before a restore operation.
export interface BackupCandidate {
  photo_folder_path: string;
  backup_folder_name: string;
  backup_path?: string;
  created_at: string;
}
