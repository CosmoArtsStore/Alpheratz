import { useCallback, useEffect, useState } from 'react';
import type { AppSetting } from '../models/types';
import type { ThemeMode, ViewMode } from '../../../shared/models/types';
import {
  createTagMaster as createTagMasterCommand,
  deleteTagMaster as deleteTagMasterCommand,
  loadAllTags,
  loadAppSetting as loadAppSettingCommand,
  resolveUnknownWorldsFromArchive,
  resolveUnknownWorldsFromSimilarPhotos,
  saveAppSetting,
  saveStartupPreference,
} from '../services/settingsCommandsService';
import type { ToastType } from '../../../shared/hooks/useToasts';

interface UseSettingsPreferencesViewModelOptions {
  photoFolderPath: string;
  secondaryPhotoFolderPath: string;
  loadPhotos: () => Promise<void>;
  addToast?: (msg: string, type?: ToastType) => void;
  defaultTweetTemplates: string[];
  defaultActiveTweetTemplate: string;
}

/**
 * Manages persisted preferences shown in the settings modal.
 *
 * @param options Folder paths, default tweet templates, and an optional toast helper.
 * @returns Settings state plus handlers for saving preferences and managing tag masters.
 */
export const useSettingsPreferencesViewModel = ({
  photoFolderPath,
  secondaryPhotoFolderPath,
  loadPhotos,
  addToast,
  defaultTweetTemplates,
  defaultActiveTweetTemplate,
}: UseSettingsPreferencesViewModelOptions) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStartupEnabled, setIsStartupEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [masterTags, setMasterTags] = useState<string[]>([]);
  const [isArchiveResolutionRunning, setIsArchiveResolutionRunning] = useState(false);
  const [isSimilarResolutionRunning, setIsSimilarResolutionRunning] = useState(false);
  const [tweetTemplates, setTweetTemplates] = useState([defaultActiveTweetTemplate]);
  const [activeTweetTemplate, setActiveTweetTemplate] = useState(defaultActiveTweetTemplate);

  const buildSettingPayload = useCallback(
    (overrides: Partial<AppSetting> = {}): AppSetting => ({
      photoFolderPath,
      secondaryPhotoFolderPath,
      enableStartup: isStartupEnabled,
      themeMode,
      viewMode,
      tweetTemplates,
      activeTweetTemplate,
      ...overrides,
    }),
    [
      photoFolderPath,
      secondaryPhotoFolderPath,
      isStartupEnabled,
      themeMode,
      viewMode,
      tweetTemplates,
      activeTweetTemplate,
    ],
  );

  const saveSetting = useCallback(
    (overrides: Partial<AppSetting> = {}) => saveAppSetting(buildSettingPayload(overrides)),
    [buildSettingPayload],
  );

  const loadMasterTags = useCallback(async () => {
    try {
      const tags = await loadAllTags();
      setMasterTags(tags);
    } catch (err) {
      addToast?.(`タグマスタの読み込みに失敗しました: ${String(err)}`, 'error');
    }
  }, [addToast]);

  useEffect(() => {
    const loadAppSetting = async () => {
      try {
        const setting = await loadAppSettingCommand();
        setIsStartupEnabled(!!setting.enableStartup);
        setThemeMode(setting.themeMode === 'dark' ? 'dark' : 'light');
        setViewMode(setting.viewMode === 'gallery' ? 'gallery' : 'standard');
        const resolvedTemplates =
          setting.tweetTemplates && setting.tweetTemplates.length > 0
            ? setting.tweetTemplates
            : defaultTweetTemplates;
        const resolvedActiveTemplate = resolvedTemplates.includes(setting.activeTweetTemplate ?? '')
          ? (setting.activeTweetTemplate ?? defaultActiveTweetTemplate)
          : resolvedTemplates[0];
        setTweetTemplates(resolvedTemplates);
        setActiveTweetTemplate(resolvedActiveTemplate);
        await loadMasterTags();
      } catch (err) {
        addToast?.(`設定の読み込みに失敗しました: ${String(err)}`, 'error');
      }
    };

    void loadAppSetting();
  }, [addToast, defaultActiveTweetTemplate, defaultTweetTemplates, loadMasterTags]);

  const handleStartupPreference = useCallback(
    async (enabled: boolean) => {
      try {
        await saveStartupPreference(enabled);
        setIsStartupEnabled(enabled);
        addToast?.(
          enabled
            ? 'Alpheratz をログイン時に起動する設定にしました。'
            : 'Alpheratz のログイン時起動を無効にしました。',
        );
      } catch (err) {
        addToast?.(`自動起動設定の更新に失敗しました: ${String(err)}`, 'error');
      }
    },
    [addToast],
  );

  const handleThemeToggle = useCallback(async () => {
    const nextTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    try {
      await saveSetting({
        themeMode: nextTheme,
      });
      setThemeMode(nextTheme);
    } catch (err) {
      addToast?.(`テーマ設定の更新に失敗しました: ${String(err)}`, 'error');
    }
  }, [addToast, saveSetting, themeMode]);

  const createTagMaster = useCallback(
    async (tag: string) => {
      const normalized = tag.trim();
      if (!normalized) {
        return;
      }

      try {
        await createTagMasterCommand(normalized);
        await loadMasterTags();
        addToast?.('タグマスタを追加しました。');
      } catch (err) {
        addToast?.(`タグマスタの追加に失敗しました: ${String(err)}`, 'error');
      }
    },
    [addToast, loadMasterTags],
  );

  const deleteTagMaster = useCallback(
    async (tag: string) => {
      try {
        await deleteTagMasterCommand(tag);
        await loadMasterTags();
        addToast?.('タグマスタを削除しました。');
      } catch (err) {
        addToast?.(`タグマスタの削除に失敗しました: ${String(err)}`, 'error');
      }
    },
    [addToast, loadMasterTags],
  );

  const handleViewModeChange = useCallback(
    async (nextViewMode: ViewMode) => {
      try {
        await saveSetting({
          viewMode: nextViewMode,
        });
        setViewMode(nextViewMode);
      } catch (err) {
        addToast?.(`表示形式の更新に失敗しました: ${String(err)}`, 'error');
      }
    },
    [addToast, saveSetting],
  );

  const handleResolveUnknownWorldsFromArchive = useCallback(async () => {
    setIsArchiveResolutionRunning(true);
    try {
      const resolvedCount = await resolveUnknownWorldsFromArchive();
      await loadPhotos();
      addToast?.(
        resolvedCount > 0
          ? `archive から ${resolvedCount} 件のワールド名を補完しました。`
          : 'archive から補完できるワールド名はありませんでした。',
      );
    } catch (err) {
      addToast?.(`archive 補完に失敗しました: ${String(err)}`, 'error');
    } finally {
      setIsArchiveResolutionRunning(false);
    }
  }, [addToast, loadPhotos]);

  const handleResolveUnknownWorldsFromSimilarPhotos = useCallback(async () => {
    setIsSimilarResolutionRunning(true);
    try {
      const resolvedCount = await resolveUnknownWorldsFromSimilarPhotos();
      await loadPhotos();
      addToast?.(
        resolvedCount > 0
          ? `類似写真から ${resolvedCount} 件のワールド名を推測しました。`
          : '類似写真から推測できるワールド名はありませんでした。',
      );
    } catch (err) {
      addToast?.(`類似写真からの推測に失敗しました: ${String(err)}`, 'error');
    } finally {
      setIsSimilarResolutionRunning(false);
    }
  }, [addToast, loadPhotos]);

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    isStartupEnabled,
    themeMode,
    viewMode,
    masterTags,
    tweetTemplates,
    setTweetTemplates,
    activeTweetTemplate,
    setActiveTweetTemplate,
    saveSetting,
    handleStartupPreference,
    handleThemeToggle,
    isArchiveResolutionRunning,
    isSimilarResolutionRunning,
    handleResolveUnknownWorldsFromArchive,
    handleResolveUnknownWorldsFromSimilarPhotos,
    createTagMaster,
    deleteTagMaster,
    handleViewModeChange,
  };
};
