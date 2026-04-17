import { useState, useCallback, useEffect } from 'react';
import type { Photo } from '../models/types';
import {
  loadPhotoMemo,
  loadPhotoTags,
  openWorldUrl,
  savePhotoMemo,
} from '../services/photoCommandsService';

// Manages modal-level actions and state for the currently selected photo.
export const usePhotoActionsViewModel = (
  syncPhoto: (photo: Photo) => void,
  addToast: (msg: string) => void,
) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoHistory, setPhotoHistory] = useState<Photo[]>([]);
  const [localMemo, setLocalMemo] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const handleSaveMemo = async () => {
    if (!selectedPhoto) return;
    setIsSavingMemo(true);
    try {
      const updatedPhoto = await savePhotoMemo(
        {
          photoPath: selectedPhoto.photo_path,
          sourceSlot: selectedPhoto.source_slot ?? 1,
        },
        localMemo,
      );
      syncPhoto(updatedPhoto);
      setSelectedPhoto(updatedPhoto);
      addToast('メモを保存しました。');
    } catch (err) {
      addToast(`菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${String(err)}`);
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleOpenWorld = async () => {
    if (selectedPhoto?.world_id) {
      try {
        await openWorldUrl(selectedPhoto.world_id);
      } catch (err) {
        addToast(`繝ｯ繝ｼ繝ｫ繝峨・繝ｼ繧ｸ繧帝幕縺代∪縺帙ｓ縺ｧ縺励◆: ${String(err)}`);
      }
    }
  };

  const onSelectPhoto = useCallback((photo: Photo, isSimilarSearch = false) => {
    setSelectedPhoto((prev) => {
      if (prev && isSimilarSearch) {
        setPhotoHistory((history) => [...history, prev]);
      } else if (!isSimilarSearch) {
        setPhotoHistory([]);
      }
      return photo;
    });
    setLocalMemo('');
  }, []);

  const goBackPhoto = useCallback(() => {
    setPhotoHistory((prev) => {
      if (prev.length > 0) {
        const newHistory = [...prev];
        const lastPhoto = newHistory.pop();
        if (!lastPhoto) {
          return prev;
        }
        setSelectedPhoto(lastPhoto);
        setLocalMemo(lastPhoto.memo ?? '');
        return newHistory;
      }
      return prev;
    });
  }, []);

  const closePhotoModal = useCallback(() => {
    setSelectedPhoto(null);
    setPhotoHistory([]);
  }, []);

  useEffect(() => {
    if (!selectedPhoto) {
      setLocalMemo('');
      return;
    }

    let isMounted = true;
    setLocalMemo(selectedPhoto.memo ?? '');

    Promise.all([
      loadPhotoMemo({
        photoPath: selectedPhoto.photo_path,
        sourceSlot: selectedPhoto.source_slot ?? 1,
      }),
      loadPhotoTags({
        photoPath: selectedPhoto.photo_path,
        sourceSlot: selectedPhoto.source_slot ?? 1,
      }),
    ])
      .then(([memo, tags]) => {
        if (!isMounted) {
          return;
        }
        setLocalMemo(memo);
        const syncedPhoto = { ...selectedPhoto, memo, tags };
        setSelectedPhoto((prev) =>
          prev?.photo_path === selectedPhoto.photo_path ? syncedPhoto : prev,
        );
        syncPhoto(syncedPhoto);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          addToast(`繝｡繝｢縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${String(err)}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPhoto, syncPhoto, addToast]);

  return {
    selectedPhoto,
    setSelectedPhoto,
    closePhotoModal,
    photoHistory,
    goBackPhoto,
    localMemo,
    setLocalMemo,
    isSavingMemo,
    handleSaveMemo,
    handleOpenWorld,
    onSelectPhoto,
  };
};
