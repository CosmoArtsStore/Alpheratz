export type ThemeMode = 'light' | 'dark';

export type ViewMode = 'standard' | 'gallery';

export interface DisplayPhoto {
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

export interface DisplayPhotoItem {
  photo: DisplayPhoto;
  groupCount?: number;
  groupPhotos?: DisplayPhoto[];
}

export interface GalleryLayoutItem {
  photo: DisplayPhoto;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GalleryLayoutResult {
  items: GalleryLayoutItem[];
  totalHeight: number;
  columnWidth: number;
  columnCount: number;
  gap: number;
}
