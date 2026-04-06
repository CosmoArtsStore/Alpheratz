import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { OrientationProgress, PhashProgress, ScanProgress } from '../models/types';

export const onScanCompleted = (handler: () => void) => listen('scan:completed', handler);

export const onScanEnrichCompleted = (handler: () => void) =>
  listen('scan:enrich_completed', handler);

export const onPhashComplete = (handler: () => void) => listen('phash_complete', handler);

export const onScanProgress = (handler: (payload: ScanProgress) => void) =>
  listen<ScanProgress>('scan:progress', (event) => {
    handler(event.payload);
  });

export const onScanError = (handler: (message: string) => void) =>
  listen<string>('scan:error', (event) => {
    handler(event.payload);
  });

export const onPhashProgress = (handler: (payload: PhashProgress) => void) =>
  listen<PhashProgress>('phash_progress', (event) => {
    handler(event.payload);
  });

export const onOrientationProgress = (handler: (payload: OrientationProgress) => void) =>
  listen<OrientationProgress>('orientation_progress', (event) => {
    handler(event.payload);
  });

export const onOrientationComplete = (handler: () => void) =>
  listen('orientation_complete', handler);

export const disposeListeners = (unlistenFns: UnlistenFn[]) => {
  for (const unlisten of unlistenFns.splice(0)) unlisten();
};
