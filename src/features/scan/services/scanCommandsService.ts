import { invoke } from '@tauri-apps/api/core';
import type { OrientationProgress, PhashProgress } from '../models/types';

/** Starts the Rust-side scan pipeline. */
export const initializeScan = () => invoke('initialize_scan');

/** Requests cooperative cancellation of the active scan. */
export const cancelScan = () => invoke('cancel_scan');

/** Loads the latest perceptual-hash progress snapshot from Rust. */
export const loadPhashProgress = () => invoke<PhashProgress>('get_phash_progress_cmd');

/** Loads the latest orientation-analysis progress snapshot from Rust. */
export const loadOrientationProgress = () =>
  invoke<OrientationProgress>('get_orientation_progress_cmd');
