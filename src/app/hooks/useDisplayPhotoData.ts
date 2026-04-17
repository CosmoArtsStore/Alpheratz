import { useEffect, useMemo, useState } from 'react';
import type { Photo } from '../../features/photo/models/types';
import type { DisplayPhotoItem } from '../../shared/models/types';
import type { ToastType } from '../../shared/hooks/useToasts';
import {
  buildDisplayPhotoItems,
  getAdjacentSimilarPhotoGroup,
} from '../../features/photo/services/photoCommandsService';

interface UseDisplayPhotoDataOptions {
  photos: Photo[];
  groupingMode: 'none' | 'similar' | 'world';
  isSimilarGroupingAvailable: boolean;
  selectedPhoto: Photo | null;
  addToast: (msg: string, type?: ToastType) => void;
  similarPhotoLimit: number;
}

// Builds derived display data for the active grouping mode and modal context.
export const useDisplayPhotoData = ({
  photos,
  groupingMode,
  isSimilarGroupingAvailable,
  selectedPhoto,
  addToast,
  similarPhotoLimit,
}: UseDisplayPhotoDataOptions) => {
  const [displayPhotoItems, setDisplayPhotoItems] = useState<DisplayPhotoItem[]>([]);
  const [similarPhotos, setSimilarPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    let isMounted = true;
    buildDisplayPhotoItems(photos, groupingMode)
      .then((items) => {
        if (isMounted) {
          setDisplayPhotoItems(items);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          addToast(`表示項目の構築に失敗しました: ${String(err)}`, 'error');
          setDisplayPhotoItems(photos.map((photo) => ({ photo })));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [addToast, groupingMode, photos]);

  const selectedPhotoView = useMemo(() => {
    if (!selectedPhoto) {
      return null;
    }
    return photos.find((photo) => photo.photo_path === selectedPhoto.photo_path) ?? selectedPhoto;
  }, [photos, selectedPhoto]);

  const selectedPhotoIndex = useMemo(
    () =>
      selectedPhotoView
        ? displayPhotoItems.findIndex(
            (item) =>
              item.groupPhotos?.some(
                (photo) => photo.photo_path === selectedPhotoView.photo_path,
              ) || item.photo.photo_path === selectedPhotoView.photo_path,
          )
        : -1,
    [displayPhotoItems, selectedPhotoView],
  );

  useEffect(() => {
    if (groupingMode !== 'similar' || !isSimilarGroupingAvailable || !selectedPhotoView) {
      setSimilarPhotos([]);
      return;
    }

    let isMounted = true;
    getAdjacentSimilarPhotoGroup(photos, selectedPhotoView.photo_path, similarPhotoLimit)
      .then((group) => {
        if (isMounted) {
          setSimilarPhotos(group);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          addToast(`類似写真の取得に失敗しました: ${String(err)}`, 'error');
          setSimilarPhotos([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    addToast,
    groupingMode,
    isSimilarGroupingAvailable,
    photos,
    selectedPhotoView,
    similarPhotoLimit,
  ]);

  return {
    displayPhotoItems,
    selectedPhotoView,
    selectedPhotoIndex,
    similarPhotos,
  };
};
