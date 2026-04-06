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

export const loadPhotos = (query: PhotoQuery) => invoke<Photo[]>('get_photos', { query });

export const setPhotoFavorite = ({ photoPath, isFavorite, sourceSlot }: FavoriteTarget) =>
  invoke<Photo>('set_photo_favorite_cmd', {
    photoPath,
    isFavorite,
    sourceSlot: sourceSlot ?? 1,
  });

export const bulkSetPhotoFavorite = (photos: PhotoCommandTarget[], isFavorite: boolean) =>
  invoke<Photo[]>('bulk_set_photo_favorite_cmd', { photos, isFavorite });

export const addPhotoTag = ({ photoPath, sourceSlot }: PhotoCommandTarget, tag: string) =>
  invoke<Photo>('add_photo_tag_cmd', {
    photoPath,
    tag,
    sourceSlot: sourceSlot ?? 1,
  });

export const removePhotoTag = ({ photoPath, sourceSlot }: PhotoCommandTarget, tag: string) =>
  invoke<Photo>('remove_photo_tag_cmd', {
    photoPath,
    tag,
    sourceSlot: sourceSlot ?? 1,
  });

export const bulkAddPhotoTag = (photos: PhotoCommandTarget[], tag: string) =>
  invoke<Photo[]>('bulk_add_photo_tag_cmd', { photos, tag });

export const savePhotoMemo = ({ photoPath, sourceSlot }: PhotoCommandTarget, memo: string) =>
  invoke<Photo>('save_photo_memo_cmd', {
    photoPath,
    memo,
    sourceSlot: sourceSlot ?? 1,
  });

export const loadPhotoMemo = ({ photoPath, sourceSlot }: PhotoCommandTarget) =>
  invoke<string>('get_photo_memo_cmd', {
    photoPath,
    sourceSlot: sourceSlot ?? 1,
  });

export const loadPhotoTags = ({ photoPath, sourceSlot }: PhotoCommandTarget) =>
  invoke<string[]>('get_photo_tags_cmd', {
    photoPath,
    sourceSlot: sourceSlot ?? 1,
  });

export const openWorldUrl = (worldId: string) => invoke('open_world_url', { worldId });

export const showInExplorer = (path: string) => invoke('show_in_explorer', { path });

export const openTweetIntent = (intentUrl: string) =>
  invoke('open_tweet_intent_cmd', { intentUrl });

export const tweetPhoto = (photo: Photo, template: string) =>
  invoke('tweet_photo_cmd', { photo, template });

export const buildDisplayPhotoItems = (photos: Photo[], groupingMode: string) =>
  invoke<DisplayPhotoItem[]>('build_display_photo_items_cmd', {
    request: {
      photos,
      groupingMode,
    },
  });

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

export const copyPhotosBulk = (photoPaths: string[], destinationDir: string) =>
  invoke('bulk_copy_photos_cmd', { photoPaths, destinationDir });

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

export const createPhotoSrc = (path: string) => convertFileSrc(path);
