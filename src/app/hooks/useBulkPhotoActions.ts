import { useMemo, useState } from 'react';
import {
  bulkAddPhotoTag,
  bulkSetPhotoFavorite,
} from '../../features/photo/services/photoCommandsService';
import { selectDirectory } from '../../features/settings/services/settingsDialogService';
import { copyPhotosBulk } from '../../features/photo/services/photoCommandsService';
import type { Photo } from '../../features/photo/models/types';
import type { ToastType } from '../../shared/hooks/useToasts';

interface UseBulkPhotoActionsOptions {
  photos: Photo[];
  selectedPhotoPaths: string[];
  syncPhotos: (photos: Photo[]) => void;
  addToast?: (msg: string, type?: ToastType) => void;
}

/**
 * Coordinates favorite, tag, and copy actions for the current multi-selection.
 *
 * @param options Selected paths, full photo data, sync callback, and optional toast helper.
 * @returns Bulk-action state and handlers consumed by the gallery screen.
 */
export const useBulkPhotoActions = ({
  photos,
  selectedPhotoPaths,
  syncPhotos,
  addToast,
}: UseBulkPhotoActionsOptions) => {
  const [bulkTagSelection, setBulkTagSelection] = useState('');
  const [bulkTagDraft, setBulkTagDraft] = useState('');
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);

  const selectedPhotos = useMemo(
    () =>
      selectedPhotoPaths
        .map((photoPath) => photos.find((photo) => photo.photo_path === photoPath))
        .filter((photo): photo is Photo => photo !== undefined),
    [selectedPhotoPaths, photos],
  );
  const selectedCount = selectedPhotos.length;
  const shouldEnableBulkFavorite = useMemo(
    () => selectedPhotos.some((photo) => !photo.is_favorite),
    [selectedPhotos],
  );

  const handleBulkFavorite = async () => {
    if (selectedPhotos.length === 0) {
      return;
    }

    const isNextFavoriteState = shouldEnableBulkFavorite;
    try {
      const updatedPhotos = await bulkSetPhotoFavorite(
        selectedPhotos.map((photo) => ({
          photoPath: photo.photo_path,
          sourceSlot: photo.source_slot ?? 1,
        })),
        isNextFavoriteState,
      );
      syncPhotos(updatedPhotos);
    } catch (err) {
      addToast?.(`一括お気に入り更新に失敗しました: ${String(err)}`, 'error');
    }
  };

  const openBulkTagModal = () => {
    setBulkTagSelection('');
    setBulkTagDraft('');
    setIsBulkTagModalOpen(true);
  };

  const applyBulkTag = async () => {
    const resolvedTag = bulkTagDraft.trim() || bulkTagSelection.trim();
    if (!resolvedTag) {
      addToast?.('一括タグ付けに使うタグを選択してください。', 'error');
      return;
    }
    if (selectedPhotos.length === 0) {
      setIsBulkTagModalOpen(false);
      return;
    }

    try {
      const updatedPhotos = await bulkAddPhotoTag(
        selectedPhotos.map((photo) => ({
          photoPath: photo.photo_path,
          sourceSlot: photo.source_slot ?? 1,
        })),
        resolvedTag,
      );
      syncPhotos(updatedPhotos);
      setBulkTagDraft('');
      setBulkTagSelection('');
      setIsBulkTagModalOpen(false);
      addToast?.(`${selectedPhotos.length}件にタグを追加しました。`);
    } catch (err) {
      addToast?.(`一括タグ付けに失敗しました: ${String(err)}`, 'error');
    }
  };

  const handleBulkCopy = async () => {
    if (selectedPhotos.length === 0) {
      return;
    }

    try {
      const destination = await selectDirectory('コピー先フォルダを選択');

      if (!destination) {
        return;
      }

      await copyPhotosBulk(
        selectedPhotos.map((photo) => photo.photo_path),
        destination,
      );
    } catch (err) {
      addToast?.(`一括コピーに失敗しました: ${String(err)}`, 'error');
    }
  };

  return {
    bulkTagSelection,
    setBulkTagSelection,
    bulkTagDraft,
    setBulkTagDraft,
    isBulkTagModalOpen,
    setIsBulkTagModalOpen,
    selectedPhotos,
    selectedCount,
    shouldEnableBulkFavorite,
    handleBulkFavorite,
    openBulkTagModal,
    applyBulkTag,
    handleBulkCopy,
  };
};
