import { invoke } from '@tauri-apps/api/core';
import type { OrientationProgress, PhashProgress } from '../models/types';

export const initializeScan = () => invoke('initialize_scan');

export const cancelScan = () => invoke('cancel_scan');

export const loadPhashProgress = () => invoke<PhashProgress>('get_phash_progress_cmd');

export const loadOrientationProgress = () =>
  invoke<OrientationProgress>('get_orientation_progress_cmd');
