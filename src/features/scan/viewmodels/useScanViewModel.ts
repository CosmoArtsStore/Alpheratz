import { useState, useCallback, useEffect, useRef } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { cancelScan as cancelScanCommand, initializeScan } from '../services/scanCommandsService';
import {
  disposeListeners,
  onScanCompleted,
  onScanError,
  onScanProgress,
} from '../services/scanEventsService';
import type { ToastType } from '../../../shared/hooks/useToasts';

interface ScanSettings {
  photoFolderPath?: string;
  secondaryPhotoFolderPath?: string;
}

export const useScanViewModel = (
  loadSettings: () => Promise<ScanSettings>,
  addToast?: (msg: string, type?: ToastType) => void,
) => {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState({
    processed: 0,
    total: 0,
    current_world: '',
    phase: 'scan',
  });
  const [photoFolderPath, setPhotoFolderPath] = useState('');
  const [secondaryPhotoFolderPath, setSecondaryPhotoFolderPath] = useState('');
  const isScanningRef = useRef(false);

  const startScan = useCallback(async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setScanStatus('scanning');
    setScanProgress({ processed: 0, total: 0, current_world: '', phase: 'scan' });
    try {
      await initializeScan();
    } catch (err) {
      isScanningRef.current = false;
      setScanStatus('error');
      addToast?.(`スキャンの開始に失敗しました: ${String(err)}`, 'error');
    }
  }, [addToast]);

  const refreshSettings = useCallback(async () => {
    const setting = await loadSettings();
    setPhotoFolderPath(setting.photoFolderPath || '');
    setSecondaryPhotoFolderPath(setting.secondaryPhotoFolderPath || '');
  }, [loadSettings]);

  useEffect(() => {
    let isDisposed = false;
    const unlistenFns: UnlistenFn[] = [];

    const registerListeners = async () => {
      unlistenFns.push(
        await onScanProgress((payload) => {
          setScanProgress(payload);
        }),
      );
      unlistenFns.push(
        await onScanCompleted(() => {
          isScanningRef.current = false;
          setScanStatus('completed');
        }),
      );
      unlistenFns.push(
        await onScanError((message) => {
          isScanningRef.current = false;
          setScanStatus('error');
          addToast?.(message || 'スキャンに失敗しました。', 'error');
        }),
      );

      if (isDisposed) {
        disposeListeners(unlistenFns);
      }
    };

    void registerListeners().catch((err: unknown) => {
      addToast?.(`スキャンイベントの購読に失敗しました: ${String(err)}`, 'error');
    });

    return () => {
      isDisposed = true;
      disposeListeners(unlistenFns);
    };
  }, [addToast]);

  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      try {
        const setting = await loadSettings();
        if (isCancelled) {
          return;
        }

        const configuredPath = setting.photoFolderPath || '';
        const secondaryConfiguredPath = setting.secondaryPhotoFolderPath || '';
        setPhotoFolderPath(configuredPath);
        setSecondaryPhotoFolderPath(secondaryConfiguredPath);
        if (!configuredPath && !secondaryConfiguredPath) {
          addToast?.('写真フォルダが未設定です。設定からフォルダを選択してください。', 'info');
          return;
        }

        await startScan();
      } catch (err) {
        if (!isCancelled) {
          addToast?.(`設定の読み込みに失敗しました: ${String(err)}`, 'error');
        }
      }
    };

    void initialize();
    return () => {
      isCancelled = true;
    };
  }, [addToast, loadSettings, startScan]);

  const cancelScan = useCallback(async () => {
    try {
      await cancelScanCommand();
    } catch (err) {
      addToast?.(`スキャンの中断に失敗しました: ${String(err)}`, 'error');
    }
  }, [addToast]);

  return {
    scanStatus,
    scanProgress,
    photoFolderPath,
    secondaryPhotoFolderPath,
    startScan,
    refreshSettings,
    cancelScan,
  };
};
