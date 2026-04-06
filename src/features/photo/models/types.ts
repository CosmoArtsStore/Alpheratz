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
  match_source?: 'metadata' | 'title' | 'stella_db' | 'phash' | null;
  is_missing?: boolean;
}

export interface PhotoQuery {
  startDate: string | null;
  endDate: string | null;
  worldQuery: string | null;
  worldExact: string | null;
  orientation: string | null;
  favoritesOnly: boolean | null;
  tagFilters: string[] | null;
  includePhash: boolean;
}
