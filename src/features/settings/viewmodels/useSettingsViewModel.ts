import { useSettingsPreferencesViewModel } from './useSettingsPreferencesViewModel';
import { useFolderMigrationFlowViewModel } from './useFolderMigrationFlowViewModel';
import type { ToastType } from '../../../shared/hooks/useToasts';

interface UseSettingsViewModelOptions {
  photoFolderPath: string;
  secondaryPhotoFolderPath: string;
  refreshSettings: () => Promise<void>;
  loadPhotos: () => Promise<void>;
  startScan: () => Promise<void>;
  clearPhotos: () => void;
  addToast?: (msg: string, type?: ToastType) => void;
  defaultTweetTemplates: string[];
  defaultActiveTweetTemplate: string;
}

// Combines settings preferences and folder-migration flows for the settings modal.
export const useSettingsViewModel = ({
  photoFolderPath,
  secondaryPhotoFolderPath,
  refreshSettings,
  loadPhotos,
  startScan,
  clearPhotos,
  addToast,
  defaultTweetTemplates,
  defaultActiveTweetTemplate,
}: UseSettingsViewModelOptions) => {
  const preferences = useSettingsPreferencesViewModel({
    photoFolderPath,
    secondaryPhotoFolderPath,
    loadPhotos,
    addToast,
    defaultTweetTemplates,
    defaultActiveTweetTemplate,
  });

  const folderMigration = useFolderMigrationFlowViewModel({
    photoFolderPath,
    secondaryPhotoFolderPath,
    saveSetting: preferences.saveSetting,
    refreshSettings,
    loadPhotos,
    startScan,
    clearPhotos,
    addToast,
  });

  return {
    ...preferences,
    ...folderMigration,
  };
};
