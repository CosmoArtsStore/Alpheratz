import { useEffect, useState } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { OrientationProgress } from '../models/types';
import { loadOrientationProgress } from '../services/scanCommandsService';
import { onOrientationComplete, onOrientationProgress } from '../services/scanEventsService';

const EMPTY_PROGRESS: OrientationProgress = {
  done: 0,
  total: 0,
  current: null,
};

export function useScanOrientationViewModel() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const unlistenFns: UnlistenFn[] = [];

    const setup = async () => {
      try {
        const initial = await loadOrientationProgress();
        setProgress(initial);
        setIsRunning(initial.total > 0 && initial.done < initial.total);
      } catch {
        setProgress(EMPTY_PROGRESS);
      }

      unlistenFns.push(
        await onOrientationProgress((payload) => {
          setProgress(payload);
          setIsRunning(true);
        }),
      );

      unlistenFns.push(
        await onOrientationComplete(() => {
          setIsRunning(false);
          setProgress((prev) => ({
            ...prev,
            done: prev.total,
            current: null,
          }));
        }),
      );
    };

    void setup();

    return () => {
      for (const unlisten of unlistenFns) unlisten();
    };
  }, []);

  return { progress, isRunning };
}
