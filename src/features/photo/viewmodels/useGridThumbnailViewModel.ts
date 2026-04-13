import { useEffect, useState } from 'react';
import { createGridThumbnailSrc } from '../services/photoCommandsService';

/**
 * Lazily resolves a generated grid-thumbnail URL for a photo.
 *
 * @param photoPath Absolute source photo path.
 * @param sourceSlot Source library slot used by the thumbnail command.
 * @param shouldLoad Whether the thumbnail should be generated right now.
 * @returns The generated thumbnail URL, or `null` while unavailable.
 */
export const useGridThumbnailViewModel = (
  photoPath: string | null | undefined,
  sourceSlot: number | null | undefined,
  shouldLoad: boolean,
) => {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath || !shouldLoad) {
      setThumbnailSrc(null);
      return;
    }

    let isMounted = true;
    createGridThumbnailSrc(photoPath, sourceSlot)
      .then((path) => {
        if (isMounted) {
          setThumbnailSrc(path);
        }
      })
      .catch(() => {
        if (isMounted) {
          setThumbnailSrc(null);
        }
      });

    return () => {
      isMounted = false;
      setThumbnailSrc(null);
    };
  }, [photoPath, shouldLoad, sourceSlot]);

  return thumbnailSrc;
};
