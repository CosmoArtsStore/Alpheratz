/** Stored photo record returned from the Rust cache and query layer. */
export interface Photo {
  photo_filename: string;
  photo_path: string;
  world_id: string | null;
  world_name: string | null;
  timestamp: string;
  memo: string;
  phash: string | null;
  orientation?: 'portrait' | 'landscape' | 'unknown' | null;
  image_width?: number | null;
  image_height?: number | null;
  source_slot?: number | null;
  is_favorite: boolean;
  tags: string[];
  match_source?: 'metadata' | 'title' | 'polaris_archive' | 'phash' | 'unresolved' | null;
  is_missing?: boolean;
}

/** Filter set sent to the Rust photo query command. */
export interface PhotoQuery {
  /** Inclusive lower date bound in `YYYY-MM-DD` form. */
  startDate: string | null;
  /** Inclusive upper date bound in `YYYY-MM-DD` form. */
  endDate: string | null;
  /** Partial world-name query used for fuzzy filtering. */
  worldQuery: string | null;
  /** Exact world-name filter when the sidebar selected specific worlds. */
  worldExact: string | null;
  /** Requested orientation filter, or `null` for all photos. */
  orientation: string | null;
  /** Whether only favorites should be returned. */
  favoritesOnly: boolean | null;
  /** Required tags that matched photos must include. */
  tagFilters: string[] | null;
  /** Whether perceptual hashes should be loaded for grouping logic. */
  includePhash: boolean;
}
