export interface ScanProgress {
  processed: number;
  total: number;
  current_world: string;
  phase: string;
}

export interface PhashProgress {
  done: number;
  total: number;
  current?: string | null;
}

export interface OrientationProgress {
  done: number;
  total: number;
  current?: string | null;
}
