use serde::{Deserialize, Serialize};

// cache DB とフロントエンド間で受け渡す写真レコード。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhotoRecord {
    /// File name used as the logical identifier inside a source slot.
    pub photo_filename: String,
    /// Absolute file path used for loading and file operations.
    pub photo_path: String,
    /// Matched `VRChat` world id when one was found.
    pub world_id: Option<String>,
    /// Matched world name shown in the UI.
    pub world_name: Option<String>,
    /// Capture timestamp used for sorting and filtering.
    pub timestamp: String,
    #[serde(default)]
    /// User-authored memo associated with the photo.
    pub memo: String,
    /// Stored perceptual-hash variants for similarity grouping.
    pub phash: Option<String>,
    /// Stored orientation label such as portrait or landscape.
    pub orientation: Option<String>,
    /// Stored image width when analyzed.
    pub image_width: Option<i64>,
    /// Stored image height when analyzed.
    pub image_height: Option<i64>,
    #[serde(default)]
    /// Source library slot used by multi-folder support.
    pub source_slot: i64,
    #[serde(default)]
    /// Whether the photo is marked as a favorite.
    pub is_favorite: bool,
    #[serde(default)]
    /// User-defined tags attached to the photo.
    pub tags: Vec<String>,
    /// Strategy that produced the world match.
    pub match_source: Option<String>,
    #[serde(default)]
    /// Whether the cached record points to a missing file.
    pub is_missing: bool,
}

// フロントエンド表示用に束ねた写真アイテム。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DisplayPhotoItemRecord {
    /// Representative photo rendered for the group.
    pub photo: PhotoRecord,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Number of photos represented by the group, when grouping is active.
    pub group_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Full grouped photo list used by grouped displays and modals.
    pub group_photos: Option<Vec<PhotoRecord>>,
}

// 写真一覧 command が受け取る検索条件。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PhotoQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub world_query: Option<String>,
    pub world_exact: Option<String>,
    pub orientation: Option<String>,
    pub favorites_only: Option<bool>,
    pub tag_filters: Option<Vec<String>>,
    pub include_phash: Option<bool>,
}

impl Default for PhotoRecord {
    /// Creates an empty placeholder photo record used by grouping fallbacks.
    fn default() -> Self {
        Self {
            photo_filename: String::new(),
            photo_path: String::new(),
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

// フォルダスキャン中に流す進捗 payload。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgress {
    pub processed: usize,
    pub total: usize,
    pub current_world: String,
    pub phase: String,
}
