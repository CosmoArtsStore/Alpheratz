use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhotoRecord {
    pub photo_filename: String,
    pub photo_path: String,
    #[serde(default)]
    pub resolved_photo_path: Option<String>,
    #[serde(default)]
    pub grid_thumb_path: Option<String>,
    #[serde(default)]
    pub display_thumb_path: Option<String>,
    pub world_id: Option<String>,
    pub world_name: Option<String>,
    pub timestamp: String,
    #[serde(default)]
    pub memo: String,
    pub phash: Option<String>,
    pub orientation: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
    #[serde(default)]
    pub source_slot: i64,
    #[serde(default)]
    pub is_favorite: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    pub match_source: Option<String>,
    #[serde(default)]
    pub is_missing: bool,
}

impl Default for PhotoRecord {
    fn default() -> Self {
        Self {
            photo_filename: String::new(),
            photo_path: String::new(),
            resolved_photo_path: None,
            grid_thumb_path: None,
            display_thumb_path: None,
            world_id: None,
            world_name: None,
            timestamp: String::new(),
            memo: String::new(),
            phash: None,
            orientation: None,
            image_width: None,
            image_height: None,
            source_slot: 1,
            is_favorite: false,
            tags: Vec::new(),
            match_source: None,
            is_missing: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub processed: usize,
    pub total: usize,
    pub current_world: String,
    pub phase: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorldFilterOption {
    pub world_name: Option<String>,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PhotoPage {
    pub items: Vec<PhotoRecord>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GroupedPhotoRecord {
    pub photo: PhotoRecord,
    pub group_count: usize,
    pub group_key: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GroupedPhotoPage {
    pub items: Vec<GroupedPhotoRecord>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SelectedPhotoRef {
    pub photo_path: String,
    pub source_slot: i64,
    pub is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SimilarWorldCandidate {
    pub photo: PhotoRecord,
    pub distance: u32,
    pub similarity: f32,
}
