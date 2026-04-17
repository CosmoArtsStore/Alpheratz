import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { Photo, PhotoQuery } from '../models/types';
import type { DisplayPhotoItem } from '../../../shared/models/types';

interface PhotoCommandTarget {
  photoPath: string;
  sourceSlot?: number | null;
}

type FavoriteTarget = PhotoCommandTarget & {
  isFavorite: boolean;
};

// Loads photos that match the current sidebar filter state.
export const loadPhotos = (query: PhotoQuery) => invoke<Photo[]>('get_photos', { query });

// Updates the favorite flag for one photo and returns the refreshed record.
export const setPhotoFavorite = ({ photoPath, isFavorite, sourceSlot }: FavoriteTarget) =>
  invoke<Photo>('set_photo_favorite_cmd', {
    photoPath,
    isFavorite,
    sourceSlot: sourceSlot ?? 1,
  });

// Updates the favorite flag for multiple selected photos at once.
export const bulkSetPhotoFavorite = (photos: PhotoCommandTarget[], isFavorite: boolean) =>
  invoke<Photo[]>('bulk_set_photo_favorite_cmd', { photos, isFavorite });

// Adds a tag to one photo and returns the refreshed record.
export const addPhotoTag = ({ photoPath, sourceSlot }: PhotoCommandTarget, tag: string) =>
  invoke<Photo>('add_photo_tag_cmd', {
    photoPath,
    tag,
    sourceSlot: sourceSlot ?? 1,
  });

// Removes a tag from one photo and returns the refreshed record.
export const removePhotoTag = ({ photoPath, sourceSlot }: PhotoCommandTarget, tag: string) =>
  invoke<Photo>('remove_photo_tag_cmd', {
    photoPath,
    tag,
    sourceSlot: sourceSlot ?? 1,
  });

// Adds the same tag to every selected photo.
export const bulkAddPhotoTag = (photos: PhotoCommandTarget[], tag: string) =>
  invoke<Photo[]>('bulk_add_photo_tag_cmd', { photos, tag });

// Saves a memo for one photo and returns the refreshed record.
export const savePhotoMemo = ({ photoPath, sourceSlot }: PhotoCommandTarget, memo: string) =>
  invoke<Photo>('save_photo_memo_cmd', {
    photoPath,
    memo,
    sourceSlot: sourceSlot ?? 1,
  });

// Loads the stored memo text for one photo.
export const loadPhotoMemo = ({ photoPath, sourceSlot }: PhotoCommandTarget) =>
  invoke<string>('get_photo_memo_cmd', {
    photoPath,
    sourceSlot: sourceSlot ?? 1,
  });

// Loads tags attached to one photo.
export const loadPhotoTags = ({ photoPath, sourceSlot }: PhotoCommandTarget) =>
  invoke<string[]>('get_photo_tags_cmd', {
    photoPath,
    sourceSlot: sourceSlot ?? 1,
  });

// Opens the related VRChat world page in the browser.
export const openWorldUrl = (worldId: string) => invoke('open_world_url', { worldId });

// Reveals a path in the platform file manager.
export const showInExplorer = (path: string) => invoke('show_in_explorer', { path });

// Opens a prepared tweet intent URL in the browser.
export const openTweetIntent = (intentUrl: string) =>
  invoke('open_tweet_intent_cmd', { intentUrl });

// Builds and opens a tweet flow for the selected photo and template.
export const tweetPhoto = (photo: Photo, template: string) =>
  invoke('tweet_photo_cmd', { photo, template });

// Builds grouped display items on the Rust side for consistent matching logic.
export const buildDisplayPhotoItems = (photos: Photo[], groupingMode: string) =>
  invoke<DisplayPhotoItem[]>('build_display_photo_items_cmd', {
    request: {
      photos,
      groupingMode,
    },
  });

// Loads photos adjacent to the anchor photo in the similarity group ordering.
export const getAdjacentSimilarPhotoGroup = (
  photos: Photo[],
  anchorPhotoPath: string,
  limit?: number,
) =>
  invoke<Photo[]>('get_adjacent_similar_photo_group_cmd', {
    request: {
      photos,
      anchorPhotoPath,
      limit,
    },
  });

// Copies multiple photo files to a user-selected destination directory.
export const copyPhotosBulk = (photoPaths: string[], destinationDir: string) =>
  invoke('bulk_copy_photos_cmd', { photoPaths, destinationDir });

// Creates a grid thumbnail file URL for lazy gallery rendering.
export const createGridThumbnailSrc = async (
  path: string,
  sourceSlot: number | null | undefined,
) => {
  const thumbnailPath = await invoke<string>('create_grid_thumbnail', {
    path,
    sourceSlot: sourceSlot ?? 1,
  });
  return convertFileSrc(thumbnailPath);
};

// Converts an absolute photo path into a browser-safe file URL.
export const createPhotoSrc = (path: string) => convertFileSrc(path);
