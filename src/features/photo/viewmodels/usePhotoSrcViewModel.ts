import { useMemo } from 'react';
import { createPhotoSrc } from '../services/photoCommandsService';

// Memoizes the browser-safe file URL for a photo path.
export const usePhotoSrcViewModel = (photoPath: string) =>
  useMemo(() => createPhotoSrc(photoPath), [photoPath]);
