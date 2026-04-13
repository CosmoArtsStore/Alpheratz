import { useEffect, useState } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { PhashProgress } from '../models/types';
import { loadPhashProgress } from '../services/scanCommandsService';
import { onPhashComplete, onPhashProgress } from '../services/scanEventsService';

const EMPTY_PROGRESS: PhashProgress = {
  done: 0,
  total: 0,
  current: null,
};

/**
 * Tracks perceptual-hash progress by combining the latest snapshot and live events.
 *
 * @returns The current pHash progress payload and whether the task is still running.
 */
export function useScanPhashViewModel() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const unlistenFns: UnlistenFn[] = [];

    const setup = async () => {
      try {
        const initial = await loadPhashProgress();
        setProgress(initial);
        setIsRunning(initial.total > 0 && initial.done < initial.total);
      } catch {
        setProgress(EMPTY_PROGRESS);
      }

      unlistenFns.push(
        await onPhashProgress((payload) => {
          setProgress(payload);
          setIsRunning(true);
        }),
      );

      unlistenFns.push(
        await onPhashComplete(() => {
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
