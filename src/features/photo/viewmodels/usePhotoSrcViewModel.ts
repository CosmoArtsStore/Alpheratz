import { useMemo } from 'react';
import { createPhotoSrc } from '../services/photoCommandsService';

/**
 * Memoizes the browser-safe file URL for a photo path.
 *
 * @param photoPath Absolute local photo path.
 * @returns A file URL that can be used directly in an image element.
 */
export const usePhotoSrcViewModel = (photoPath: string) =>
  useMemo(() => createPhotoSrc(photoPath), [photoPath]);
