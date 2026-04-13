import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DisplayPhotoItem } from '../../shared/models/types';
import type { Photo } from '../../features/photo/models/types';

/**
 * Tracks photo selection state, including shift-range selection.
 *
 * The hook keeps selection logic independent from the rendering mode so both the
 * standard grid and grouped displays can share the same behavior.
 *
 * @param photos Currently visible photo records.
 * @param displayPhotoItems Rendered display items used to resolve range selection.
 * @returns Selection state plus helpers for toggling and clearing selections.
 */
export const usePhotoSelection = (photos: Photo[], displayPhotoItems: DisplayPhotoItem[]) => {
  const [selectedPhotoPaths, setSelectedPhotoPaths] = useState<string[]>([]);
  const [selectionAnchorPhotoPath, setSelectionAnchorPhotoPath] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPhotoPaths((prev) =>
      prev.filter((photoPath) => photos.some((photo) => photo.photo_path === photoPath)),
    );
  }, [photos]);

  useEffect(() => {
    if (
      selectionAnchorPhotoPath &&
      !photos.some((photo) => photo.photo_path === selectionAnchorPhotoPath)
    ) {
      setSelectionAnchorPhotoPath(null);
    }
  }, [photos, selectionAnchorPhotoPath]);

  const selectedPhotoPathSet = useMemo(() => new Set(selectedPhotoPaths), [selectedPhotoPaths]);
  const selectedCount = selectedPhotoPaths.length;

  const toggleSelectedPhoto = useCallback(
    (item: DisplayPhotoItem, shiftKey: boolean) => {
      const photoPath = item.photo.photo_path;
      if (shiftKey && selectionAnchorPhotoPath) {
        const anchorIndex = displayPhotoItems.findIndex(
          (entry) => entry.photo.photo_path === selectionAnchorPhotoPath,
        );
        const targetIndex = displayPhotoItems.findIndex(
          (entry) => entry.photo.photo_path === photoPath,
        );
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const startIndex = Math.min(anchorIndex, targetIndex);
          const endIndex = Math.max(anchorIndex, targetIndex);
          const rangePhotoPaths = displayPhotoItems
            .slice(startIndex, endIndex + 1)
            .map((entry) => entry.photo.photo_path);

          setSelectedPhotoPaths((prev) => Array.from(new Set([...prev, ...rangePhotoPaths])));
          setSelectionAnchorPhotoPath(photoPath);
          return;
        }
      }

      setSelectedPhotoPaths((prev) =>
        prev.includes(photoPath)
          ? prev.filter((currentPath) => currentPath !== photoPath)
          : [...prev, photoPath],
      );
      setSelectionAnchorPhotoPath(photoPath);
    },
    [displayPhotoItems, selectionAnchorPhotoPath],
  );

  const clearSelectedPhotos = useCallback(() => {
    setSelectedPhotoPaths([]);
    setSelectionAnchorPhotoPath(null);
  }, []);

  return {
    selectedPhotoPaths,
    selectedPhotoPathSet,
    selectedCount,
    toggleSelectedPhoto,
    clearSelectedPhotos,
  };
};
