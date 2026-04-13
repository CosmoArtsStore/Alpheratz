import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { OrientationProgress, PhashProgress, ScanProgress } from '../models/types';

/** Subscribes to the event fired when the initial scan completes. */
export const onScanCompleted = (handler: () => void) => listen('scan:completed', handler);

/** Subscribes to the event fired when post-scan enrichment completes. */
export const onScanEnrichCompleted = (handler: () => void) =>
  listen('scan:enrich_completed', handler);

/** Subscribes to the event fired when pHash generation completes. */
export const onPhashComplete = (handler: () => void) => listen('phash_complete', handler);

/** Subscribes to streaming scan progress events and unwraps the payload. */
export const onScanProgress = (handler: (payload: ScanProgress) => void) =>
  listen<ScanProgress>('scan:progress', (event) => {
    handler(event.payload);
  });

/** Subscribes to scan error events emitted by Rust. */
export const onScanError = (handler: (message: string) => void) =>
  listen<string>('scan:error', (event) => {
    handler(event.payload);
  });

/** Subscribes to incremental pHash progress updates. */
export const onPhashProgress = (handler: (payload: PhashProgress) => void) =>
  listen<PhashProgress>('phash_progress', (event) => {
    handler(event.payload);
  });

/** Subscribes to incremental orientation-analysis progress updates. */
export const onOrientationProgress = (handler: (payload: OrientationProgress) => void) =>
  listen<OrientationProgress>('orientation_progress', (event) => {
    handler(event.payload);
  });

/** Subscribes to the event fired when orientation analysis completes. */
export const onOrientationComplete = (handler: () => void) =>
  listen('orientation_complete', handler);

/**
 * Disposes a mutable list of Tauri unlisten callbacks in place.
 *
 * @param unlistenFns Listener cleanup callbacks accumulated by a view model.
 * @returns `void`. The input array is emptied as each listener is removed.
 */
export const disposeListeners = (unlistenFns: UnlistenFn[]) => {
  for (const unlisten of unlistenFns.splice(0)) unlisten();
};
