export interface Photo {
    photo_filename: string;
    photo_path: string;
    resolved_photo_path?: string | null;
    grid_thumb_path?: string | null;
    display_thumb_path?: string | null;
    world_id: string | null;
    world_name: string | null;
    timestamp: string;
    memo: string;
    phash: string | null;
    orientation?: "portrait" | "landscape" | "unknown" | null;
    image_width?: number | null;
    image_height?: number | null;
    source_slot?: number | null;
    is_favorite: boolean;
    tags: string[];
    match_source?: "metadata" | "title" | "stella_db" | "phash" | null;
    is_missing?: boolean;
}

export interface DisplayPhotoItem {
    photo: Photo;
    groupCount?: number;
    groupKey?: string;
    groupPhotos?: Photo[];
}

export interface ScanProgress {
    processed: number;
    total: number;
    current_world: string;
    phase: string;
}

export interface MonthGroup {
    key: string;
    year: number;
    month: number;
    label: string;
    rowIndex: number;
    count: number;
}

export interface WorldFilterOption {
    world_name: string | null;
    count: number;
}

export interface PhotoPage {
    items: Photo[];
    total: number;
}

export interface GroupedPhotoRecord {
    photo: Photo;
    group_count: number;
    group_key: string;
}

export interface GroupedPhotoPage {
    items: GroupedPhotoRecord[];
    total: number;
}

export interface SelectedPhotoRef {
    photo_path: string;
    source_slot: number;
    is_favorite: boolean;
}

export interface SimilarWorldCandidate {
    photo: Photo;
    distance: number;
    similarity: number;
}
