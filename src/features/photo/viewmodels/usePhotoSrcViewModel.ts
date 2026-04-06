import { useMemo } from 'react';
import { createPhotoSrc } from '../services/photoCommandsService';

export const usePhotoSrcViewModel = (photoPath: string) =>
  useMemo(() => createPhotoSrc(photoPath), [photoPath]);
