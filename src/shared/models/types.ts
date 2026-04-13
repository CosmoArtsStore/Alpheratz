/** Selectable theme modes shared across the application. */
export type ThemeMode = 'light' | 'dark';

/** Available photo browsing layouts exposed by the settings UI. */
export type ViewMode = 'standard' | 'gallery';

/** Photo data normalized for frontend rendering. */
export interface DisplayPhoto {
  /** Original file name stored in the cache database. */
  photo_filename: string;
  /** Absolute file path used for loading and file operations. */
  photo_path: string;
  /** Matched VRChat world id when one could be resolved. */
  world_id: string | null;
  /** Matched world name shown in the UI. */
  world_name: string | null;
  /** Capture timestamp used for sorting and grouping. */
  timestamp: string;
  /** User-authored memo saved for the photo. */
  memo: string;
  /** Perceptual hash used for duplicate or similarity grouping. */
  phash: string | null;
  /** Resolved orientation used by filters and gallery sizing. */
  orientation?: 'portrait' | 'landscape' | 'unknown' | null;
  /** Stored image width when known. */
  image_width?: number | null;
  /** Stored image height when known. */
  image_height?: number | null;
  /** Source library slot for multi-folder support. */
  source_slot?: number | null;
  /** Whether the user marked the photo as a favorite. */
  is_favorite: boolean;
  /** User-defined tags attached to the photo. */
  tags: string[];
  /** Strategy that produced the world match for this photo. */
  match_source?: 'metadata' | 'title' | 'polaris_archive' | 'phash' | 'unresolved' | null;
  /** Whether the cached record points to a file that no longer exists. */
  is_missing?: boolean;
}

/** One photo card entry as rendered by the UI, optionally with grouping context. */
export interface DisplayPhotoItem {
  photo: DisplayPhoto;
  groupCount?: number;
  groupPhotos?: DisplayPhoto[];
}

/** Absolute positioning data for one gallery card. */
export interface GalleryLayoutItem {
  photo: DisplayPhoto;
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Full masonry-like layout result returned for the gallery viewport. */
export interface GalleryLayoutResult {
  items: GalleryLayoutItem[];
  totalHeight: number;
  columnWidth: number;
  columnCount: number;
  gap: number;
}
