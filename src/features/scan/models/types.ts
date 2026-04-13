/** Progress payload emitted while the initial photo scan is running. */
export interface ScanProgress {
  processed: number;
  total: number;
  current_world: string;
  phase: string;
}

/** Progress payload emitted while perceptual hashes are being calculated. */
export interface PhashProgress {
  done: number;
  total: number;
  current?: string | null;
}

/** Progress payload emitted while image orientations are being analyzed. */
export interface OrientationProgress {
  done: number;
  total: number;
  current?: string | null;
}
