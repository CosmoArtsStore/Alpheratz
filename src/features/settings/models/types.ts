import type { ThemeMode, ViewMode } from '../../../shared/models/types';

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

export interface BackupCandidate {
  photo_folder_path: string;
  backup_folder_name: string;
  backup_path?: string;
  created_at: string;
}
