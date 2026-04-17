import { useCallback, useState } from 'react';
import type { BackupCandidate } from '../models/types';
import {
  createCacheBackup,
  loadBackupCandidate,
  resetPhotoCache,
  restoreCacheBackup,
} from '../services/settingsCommandsService';
import { selectDirectory } from '../services/settingsDialogService';
import type { ToastType } from '../../../shared/hooks/useToasts';

interface UseFolderMigrationFlowViewModelOptions {
  photoFolderPath: string;
  secondaryPhotoFolderPath: string;
  saveSetting: (overrides?: {
    photoFolderPath?: string;
    secondaryPhotoFolderPath?: string;
  }) => Promise<unknown>;
  refreshSettings: () => Promise<void>;
  loadPhotos: () => Promise<void>;
  startScan: () => Promise<void>;
  clearPhotos: () => void;
  addToast?: (msg: string, type?: ToastType) => void;
}

// 写真フォルダ切替と backup 復元フローをまとめて扱う。
export const useFolderMigrationFlowViewModel = ({
  photoFolderPath,
  secondaryPhotoFolderPath,
  saveSetting,
  refreshSettings,
  loadPhotos,
  startScan,
  clearPhotos,
  addToast,
}: UseFolderMigrationFlowViewModelOptions) => {
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null);
  const [pendingFolderSlot, setPendingFolderSlot] = useState<1 | 2>(1);
  const [pendingRestoreCandidate, setPendingRestoreCandidate] = useState<BackupCandidate | null>(
    null,
  );
  const [isApplyingFolderChange, setIsApplyingFolderChange] = useState(false);

  const finalizeFolderSelection = useCallback(
    async (newPath: string, restoreBackup: boolean) => {
      try {
        await saveSetting({
          photoFolderPath: pendingFolderSlot === 1 ? newPath : photoFolderPath,
          secondaryPhotoFolderPath: pendingFolderSlot === 2 ? newPath : secondaryPhotoFolderPath,
        });

        if (restoreBackup) {
          await restoreCacheBackup(newPath);
        }

        await refreshSettings();
        await loadPhotos();
        await startScan();
        setPendingRestoreCandidate(null);
        setPendingFolderPath(null);
        addToast?.(
          restoreBackup
            ? 'バックアップデータを反映して再スキャンを開始します'
            : '写真フォルダを更新しました',
        );
      } catch (err) {
        addToast?.(`写真フォルダの切替に失敗しました: ${String(err)}`, 'error');
      } finally {
        setIsApplyingFolderChange(false);
      }
    },
    [
      addToast,
      loadPhotos,
      pendingFolderSlot,
      photoFolderPath,
      refreshSettings,
      saveSetting,
      secondaryPhotoFolderPath,
      startScan,
    ],
  );

  const applyFolderChange = useCallback(
    async (newPath: string, resetExisting: boolean) => {
      setIsApplyingFolderChange(true);
      try {
        if (resetExisting) {
          if (photoFolderPath) {
            await createCacheBackup(photoFolderPath);
          }
          await resetPhotoCache();
          clearPhotos();
        }

        const backupCandidate = await loadBackupCandidate(newPath);
        setPendingFolderPath(null);
        if (backupCandidate) {
          setPendingRestoreCandidate(backupCandidate);
          addToast?.('関連するバックアップデータを検出しました。');
          return;
        }

        await finalizeFolderSelection(newPath, false);
      } catch (err) {
        addToast?.(`写真フォルダの更新に失敗しました: ${String(err)}`, 'error');
      } finally {
        setIsApplyingFolderChange(false);
      }
    },
    [addToast, clearPhotos, finalizeFolderSelection, photoFolderPath],
  );

  const onChooseFolder = useCallback(
    async (slot: 1 | 2) => {
      try {
        const newPath = await selectDirectory();
        if (!newPath) {
          return;
        }
        const currentPath = slot === 1 ? photoFolderPath : secondaryPhotoFolderPath;
        if (newPath === currentPath) {
          return;
        }
        if (slot === 1 && photoFolderPath) {
          setPendingFolderSlot(1);
          setPendingFolderPath(newPath);
          return;
        }

        if (slot === 2) {
          await saveSetting({
            secondaryPhotoFolderPath: newPath,
          });
          await refreshSettings();
          await loadPhotos();
          await startScan();
          addToast?.('2nd 参照フォルダを更新しました');
          return;
        }

        await applyFolderChange(newPath, false);
      } catch (err) {
        addToast?.(`写真フォルダの更新に失敗しました: ${String(err)}`, 'error');
      }
    },
    [
      addToast,
      applyFolderChange,
      loadPhotos,
      photoFolderPath,
      refreshSettings,
      saveSetting,
      secondaryPhotoFolderPath,
      startScan,
    ],
  );

  return {
    pendingFolderPath,
    setPendingFolderPath,
    pendingRestoreCandidate,
    setPendingRestoreCandidate,
    isApplyingFolderChange,
    onChooseFolder,
    finalizeFolderSelection,
    applyFolderChange,
  };
};
