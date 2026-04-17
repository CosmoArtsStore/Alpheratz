import { useState, useCallback, useEffect } from 'react';
import type { ToastType } from '../../../shared/hooks/useToasts';

interface GalleryPhotosOptions {
  reloadToken?: number;
}

// Loads and stores a photo collection with shared loading state.
export const useGalleryPhotosViewModel = <TPhoto>(
  loadPhotosFn: () => Promise<TPhoto[]>,
  addToast?: (msg: string, type?: ToastType) => void,
  options: GalleryPhotosOptions = {},
) => {
  const [photos, setPhotos] = useState<TPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await loadPhotosFn();
      setPhotos(results);
    } catch (err) {
      addToast?.(`写真一覧の読み込みに失敗しました: ${String(err)}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, loadPhotosFn]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos, options.reloadToken]);

  return { photos, setPhotos, loadPhotos, isLoading };
};
