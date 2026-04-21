import { useState, useMemo, useEffect } from 'react';
import { useGalleryPhotosViewModel } from '../../features/gallery/viewmodels/useGalleryPhotosViewModel';
import { useCallback } from 'react';
import { useScanViewModel } from '../../features/scan/viewmodels/useScanViewModel';
import { useGalleryGridViewModel } from '../../features/gallery/viewmodels/useGalleryGridViewModel';
import { useGalleryScrollViewModel } from '../../features/gallery/viewmodels/useGalleryScrollViewModel';
import { useGalleryMonthsViewModel } from '../../features/gallery/viewmodels/useGalleryMonthsViewModel';
import { usePhotoActionsViewModel } from '../../features/photo/viewmodels/usePhotoActionsViewModel';
import { useScanPhashViewModel } from '../../features/scan/viewmodels/useScanPhashViewModel';
import { useFilterViewModel } from '../../features/filter/viewmodels/useFilterViewModel';
import { useSettingsViewModel } from '../../features/settings/viewmodels/useSettingsViewModel';
import { useToasts } from '../../shared/hooks/useToasts';
import { useTweetTemplates } from '../hooks/useTweetTemplates';
import { useBulkPhotoActions } from '../hooks/useBulkPhotoActions';
import { useDisplayPhotoData } from '../hooks/useDisplayPhotoData';
import { usePhotoSelection } from '../hooks/usePhotoSelection';
import styles from '../../features/gallery/views/GalleryView.module.css';
import { DEFAULT_TWEET_TEMPLATE, DEFAULT_TWEET_TEMPLATES } from '../lib/tweetTemplates';

import { Header } from '../../features/gallery/views/Header';
import { MonthNav } from '../../features/gallery/views/MonthNav';
import { EmptyState } from '../../features/gallery/views/EmptyState';
import { PhotoGrid } from '../../features/photo/views/PhotoGrid';
import { PhotoModal } from '../../features/photo/views/PhotoModal';
import { FilterSidebar } from '../../features/filter/views/FilterSidebar';
import { ScanningOverlay } from '../../features/scan/views/ScanningOverlay';
import { AppIcon, APP_ICON_NAMES } from '../../shared/components/Icons';
import { SettingsWorkspace } from '../../features/settings/views/SettingsWorkspace';
import { TagMasterWorkspace } from '../../features/settings/views/TagMasterWorkspace';
import { TweetTemplateWorkspace } from '../../features/settings/views/TweetTemplateWorkspace';
import type { PhotoQuery } from '../../features/photo/models/types';
import type { DisplayPhotoItem } from '../../shared/models/types';
import type { SimilarResolutionTarget } from '../../features/settings/models/types';
import { buildVirtualGalleryLayout } from '../../features/gallery/models/galleryLayout';
import {
  addPhotoTag,
  loadPhotos as loadPhotosCommand,
  removePhotoTag,
  setPhotoFavorite,
  showInExplorer,
} from '../../features/photo/services/photoCommandsService';
import { loadAppSetting } from '../../features/settings/services/settingsCommandsService';

const CARD_WIDTH = 270;
const ROW_HEIGHT = 246;
type GroupingMode = 'none' | 'similar' | 'world';
type MainScreen = 'gallery' | 'settings' | 'tagMaster' | 'template';
const MAX_SIMILAR_PHOTOS_IN_MODAL = 24;

// スキャンから閲覧・編集までを束ねるメイン画面を構成する。
function GalleryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
  const [activeMainScreen, setActiveMainScreen] = useState<MainScreen>('gallery');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [worldMasterCounts, setWorldMasterCounts] = useState<Record<string, number>>({});
  const [isSimilarResolutionConfirmOpen, setIsSimilarResolutionConfirmOpen] = useState(false);
  const [similarResolutionTarget, setSimilarResolutionTarget] =
    useState<SimilarResolutionTarget>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const { rightPanelRef, gridWrapperRef, panelWidth, gridHeight, columnCount } =
    useGalleryGridViewModel(CARD_WIDTH);
  const { toasts, addToast } = useToasts();
  const { progress: similarPrepProgress, isRunning: isPhashRunning } = useScanPhashViewModel();
  const {
    worldFilters,
    setWorldFilters,
    isFilterOpen,
    setIsFilterOpen,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    datePreset,
    handleDatePresetSelect,
    orientationFilter,
    setOrientationFilter,
    sortMode,
    setSortMode,
    favoritesOnly: isFavoritesOnly,
    setFavoritesOnly: setIsFavoritesOnly,
    tagFilters,
    setTagFilters,
    resetFilters,
    activeFilterCount,
  } = useFilterViewModel();
  const photoFilters = useMemo(
    () => ({
      searchQuery: debouncedQuery,
      worldFilters,
      dateFrom,
      dateTo,
      orientationFilter,
      favoritesOnly: isFavoritesOnly,
      tagFilters,
      includePhash: groupingMode === 'similar',
    }),
    [
      debouncedQuery,
      worldFilters,
      dateFrom,
      dateTo,
      orientationFilter,
      isFavoritesOnly,
      tagFilters,
      groupingMode,
    ],
  );
  const loadFilteredPhotos = useCallback(async () => {
    const query: PhotoQuery = {
      startDate: photoFilters.dateFrom || null,
      endDate: photoFilters.dateTo || null,
      worldQuery: photoFilters.searchQuery.trim() || null,
      worldExact: photoFilters.worldFilters.length === 1 ? photoFilters.worldFilters[0] : null,
      orientation: photoFilters.orientationFilter === 'all' ? null : photoFilters.orientationFilter,
      favoritesOnly: photoFilters.favoritesOnly || null,
      tagFilters: photoFilters.tagFilters.length > 0 ? photoFilters.tagFilters : null,
      includePhash: photoFilters.includePhash,
    };

    return loadPhotosCommand(query);
  }, [photoFilters]);
  const { photos, setPhotos, loadPhotos, isLoading } = useGalleryPhotosViewModel(
    loadFilteredPhotos,
    addToast,
  );
  const {
    scanStatus,
    scanProgress,
    photoFolderPath,
    secondaryPhotoFolderPath,
    startScan,
    refreshSettings,
    cancelScan,
  } = useScanViewModel(loadAppSetting, addToast);
  const {
    pendingFolderPath,
    setPendingFolderPath,
    pendingRestoreCandidate,
    setPendingRestoreCandidate,
    isApplyingFolderChange,
    isStartupEnabled,
    themeMode,
    viewMode,
    masterTags,
    tweetTemplates,
    setTweetTemplates,
    activeTweetTemplate,
    setActiveTweetTemplate,
    saveSetting,
    onChooseFolder,
    handleStartupPreference,
    handleThemeToggle,
    isArchiveResolutionRunning,
    isSimilarResolutionRunning,
    handleResolveUnknownWorldsFromArchive,
    handleResolveUnknownWorldsFromSimilarPhotos,
    createTagMaster,
    deleteTagMaster,
    handleViewModeChange,
    finalizeFolderSelection,
    applyFolderChange,
  } = useSettingsViewModel({
    photoFolderPath,
    secondaryPhotoFolderPath,
    refreshSettings,
    loadPhotos,
    startScan,
    clearPhotos: () => {
      setPhotos([]);
    },
    addToast,
    defaultTweetTemplates: DEFAULT_TWEET_TEMPLATES,
    defaultActiveTweetTemplate: DEFAULT_TWEET_TEMPLATE,
  });

  const {
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
  } = usePhotoActionsViewModel((updatedPhoto) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.photo_path === updatedPhoto.photo_path ? updatedPhoto : photo)),
    );
  }, addToast);
  const {
    tweetTemplateDraft,
    setTweetTemplateDraft,
    editingTweetTemplate,
    handleStartTweetTemplateEdit,
    handleCancelTweetTemplateEdit,
    handleSaveTweetTemplate,
    handleSelectTweetTemplate,
    handleDeleteTweetTemplate,
    handleTweetPhoto,
  } = useTweetTemplates({
    tweetTemplates,
    setTweetTemplates,
    activeTweetTemplate,
    setActiveTweetTemplate,
    saveSetting,
    addToast,
  });

  const filteredPhotos = photos;
  const worldNameCollator = useMemo(
    () =>
      new Intl.Collator(['ja-JP-u-co-unihan', 'ja-JP', 'en'], {
        numeric: true,
        sensitivity: 'base',
        ignorePunctuation: false,
      }),
    [],
  );
  const hasAllPHashesReady = useMemo(
    () => photos.every((photo) => Boolean(photo.phash?.trim())),
    [photos],
  );
  const isSimilarGroupingAvailable = !isPhashRunning && hasAllPHashesReady;

  const displayPhotos = useMemo(() => {
    if (sortMode !== 'worldNameAsc') {
      return filteredPhotos;
    }

    return filteredPhotos.slice().sort((left, right) => {
      const leftName = left.world_name?.trim() ?? '';
      const rightName = right.world_name?.trim() ?? '';

      if (!leftName && !rightName) {
        return right.timestamp.localeCompare(left.timestamp);
      }
      if (!leftName) {
        return 1;
      }
      if (!rightName) {
        return -1;
      }

      const worldCompare = worldNameCollator.compare(leftName, rightName);
      if (worldCompare !== 0) {
        return worldCompare;
      }
      return right.timestamp.localeCompare(left.timestamp);
    });
  }, [filteredPhotos, sortMode, worldNameCollator]);
  const { displayPhotoItems, selectedPhotoView, selectedPhotoIndex, similarPhotos } =
    useDisplayPhotoData({
      photos: displayPhotos,
      groupingMode,
      isSimilarGroupingAvailable,
      selectedPhoto,
      addToast,
      similarPhotoLimit: MAX_SIMILAR_PHOTOS_IN_MODAL,
    });

  const {
    selectedPhotoPaths,
    selectedPhotoPathSet,
    selectedCount,
    toggleSelectedPhoto,
    clearSelectedPhotos,
  } = usePhotoSelection(photos, displayPhotoItems);

  const {
    bulkTagSelection,
    setBulkTagSelection,
    bulkTagDraft,
    setBulkTagDraft,
    isBulkTagModalOpen,
    setIsBulkTagModalOpen,
    shouldEnableBulkFavorite,
    handleBulkFavorite,
    openBulkTagModal,
    applyBulkTag,
    handleBulkCopy,
  } = useBulkPhotoActions({
    photos,
    selectedPhotoPaths,
    syncPhotos: (updatedPhotos) => {
      const updatedMap = new Map(updatedPhotos.map((photo) => [photo.photo_path, photo]));
      setPhotos((prev) => prev.map((photo) => updatedMap.get(photo.photo_path) ?? photo));
    },
    addToast,
  });

  useEffect(() => {
    if (!isSimilarGroupingAvailable && groupingMode === 'similar') {
      setGroupingMode('none');
    }
  }, [isSimilarGroupingAvailable, groupingMode]);

  useEffect(() => {
    if (activeMainScreen !== 'gallery' && isFilterOpen) {
      setIsFilterOpen(false);
    }
  }, [activeMainScreen, isFilterOpen, setIsFilterOpen]);

  useEffect(() => {
    if (activeMainScreen !== 'gallery' && isSelectionMode) {
      setIsSelectionMode(false);
      clearSelectedPhotos();
    }
  }, [activeMainScreen, clearSelectedPhotos, isSelectionMode]);

  useEffect(() => {
    setWorldMasterCounts({});
  }, [photoFolderPath, secondaryPhotoFolderPath]);

  useEffect(() => {
    if (photos.length === 0) {
      return;
    }

    const currentCounts = photos.reduce<Record<string, number>>((acc, photo) => {
      const key = photo.world_name?.trim() || 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    setWorldMasterCounts((prev) => {
      const merged = { ...prev };
      for (const [key, count] of Object.entries(currentCounts)) {
        merged[key] = Math.max(merged[key] ?? 0, count);
      }
      return merged;
    });
  }, [photos]);

  const toggleFavorite = async (photoPath: string, current: boolean) => {
    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    try {
      const updatedPhoto = await setPhotoFavorite({
        photoPath,
        isFavorite: !current,
        sourceSlot: currentPhoto?.source_slot ?? 1,
      });
      setPhotos((prev) =>
        prev.map((photo) => (photo.photo_path === photoPath ? updatedPhoto : photo)),
      );
    } catch (err) {
      addToast(`お気に入りの更新に失敗しました: ${String(err)}`, 'error');
    }
  };

  const addTag = async (photoPath: string, tag: string) => {
    const normalized = tag.trim();
    if (!normalized) {
      return;
    }

    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    if (currentPhoto?.tags.includes(normalized)) {
      return;
    }

    try {
      const updatedPhoto = await addPhotoTag(
        {
          photoPath,
          sourceSlot: currentPhoto?.source_slot ?? 1,
        },
        normalized,
      );
      setPhotos((prev) =>
        prev.map((photo) => (photo.photo_path === photoPath ? updatedPhoto : photo)),
      );
      addToast('タグを追加しました。');
    } catch (err) {
      addToast(`タグの追加に失敗しました: ${String(err)}`, 'error');
    }
  };

  const removeTag = async (photoPath: string, tag: string) => {
    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    try {
      const updatedPhoto = await removePhotoTag(
        {
          photoPath,
          sourceSlot: currentPhoto?.source_slot ?? 1,
        },
        tag,
      );
      setPhotos((prev) =>
        prev.map((photo) => (photo.photo_path === photoPath ? updatedPhoto : photo)),
      );
      addToast('タグを削除しました。');
    } catch (err) {
      addToast(`タグの削除に失敗しました: ${String(err)}`, 'error');
    }
  };

  const handlePhotoActivate = useCallback(
    (item: DisplayPhotoItem) => {
      if (isSelectionMode) {
        toggleSelectedPhoto(item, false);
        return;
      }
      onSelectPhoto(item.photo);
    },
    [isSelectionMode, onSelectPhoto, toggleSelectedPhoto],
  );

  const galleryLayout = useMemo(
    () =>
      buildVirtualGalleryLayout(
        displayPhotoItems.map((item) => item.photo),
        panelWidth,
        columnCount,
      ),
    [displayPhotoItems, panelWidth, columnCount],
  );
  const standardColumnWidth = useMemo(
    () => Math.max(CARD_WIDTH, Math.floor(panelWidth / Math.max(1, columnCount))),
    [panelWidth, columnCount],
  );

  const {
    scrollTop,
    totalHeight,
    onGridRef,
    handleGridScroll,
    handleGridWheel,
    handleJumpToRatio,
    maxScrollTop,
  } = useGalleryScrollViewModel({
    photosLength: displayPhotoItems.length,
    columnCount,
    gridHeight,
    ROW_HEIGHT,
    totalHeightOverride: viewMode === 'gallery' ? galleryLayout.totalHeight : undefined,
  });

  const { monthGroups, monthsByYear, activeMonthIndex } = useGalleryMonthsViewModel(
    filteredPhotos,
    columnCount,
    scrollTop,
    ROW_HEIGHT,
  );

  const worldNameList = useMemo(() => {
    return Object.keys(worldMasterCounts).sort((left, right) =>
      worldNameCollator.compare(left, right),
    );
  }, [worldMasterCounts, worldNameCollator]);
  const worldCounts = useMemo(() => worldMasterCounts, [worldMasterCounts]);
  const tagOptions = useMemo(
    () => masterTags.slice().sort((left, right) => left.localeCompare(right, 'ja')),
    [masterTags],
  );
  const hasMasterTags = tagOptions.length > 0;
  const cellProps = useMemo(
    () => ({
      data: displayPhotoItems,
      onSelect: handlePhotoActivate,
      onToggleSelect: toggleSelectedPhoto,
      isSelected: (item: DisplayPhotoItem) => selectedPhotoPathSet.has(item.photo.photo_path),
      showTags: isSelectionMode && selectedCount > 0,
      showSelectionToggle: isSelectionMode,
      columnCount,
    }),
    [
      displayPhotoItems,
      handlePhotoActivate,
      toggleSelectedPhoto,
      columnCount,
      isSelectionMode,
      selectedPhotoPathSet,
      selectedCount,
    ],
  );
  const displayTotalRows = Math.ceil(displayPhotoItems.length / columnCount);
  const isGalleryScreen = activeMainScreen === 'gallery';
  const isTagMasterScreen = activeMainScreen === 'tagMaster';
  const isTemplateScreen = activeMainScreen === 'template';
  const isEditWorkspaceScreen = isTagMasterScreen || isTemplateScreen;
  const rightPanelLabel =
    activeMainScreen === 'settings'
      ? '設定'
      : activeMainScreen === 'tagMaster'
        ? 'タグマスタ編集'
        : activeMainScreen === 'template'
          ? 'テンプレート編集'
          : '写真一覧';

  return (
    <section className={[styles.root, 'alpheratz-root'].join(' ')} data-theme={themeMode}>
      <Header
        onRefresh={() => {
          if (scanStatus === 'scanning') {
            void cancelScan();
            return;
          }
          void startScan();
        }}
        onOpenSettings={() => {
          setActiveMainScreen((prev) => (prev === 'settings' ? 'gallery' : 'settings'));
        }}
        onToggleFilters={() => {
          if (!isGalleryScreen) {
            setActiveMainScreen('gallery');
            setIsFilterOpen(true);
            return;
          }
          setIsFilterOpen((prev) => !prev);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hashProgressLabel={
          isPhashRunning
            ? `ハッシュ計測中... ${similarPrepProgress.done}/${similarPrepProgress.total || 0}`
            : null
        }
        activeFilterCount={activeFilterCount}
      />

      <main className={styles['main-content']}>
        {scanStatus === 'scanning' && (
          <ScanningOverlay
            progress={scanProgress}
            title="スキャン中..."
            description="一覧表示に必要な情報を取り込んでいます"
            onCancel={() => {
              void cancelScan();
            }}
            canCancel={true}
          />
        )}
        {isGalleryScreen && isFilterOpen && (
          <button
            className={styles.backdrop}
            onClick={() => {
              setIsFilterOpen(false);
            }}
            aria-label="絞り込みを閉じる"
          />
        )}
        {isGalleryScreen && (
          <FilterSidebar
            isOpen={isFilterOpen}
            activeFilterCount={activeFilterCount}
            filteredCount={filteredPhotos.length}
            worldFilters={worldFilters}
            setWorldFilters={setWorldFilters}
            worldNameList={worldNameList}
            worldCounts={worldCounts}
            datePreset={datePreset}
            onDatePresetSelect={handleDatePresetSelect}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            orientationFilter={orientationFilter}
            setOrientationFilter={setOrientationFilter}
            sortMode={sortMode}
            setSortMode={setSortMode}
            orientationFilterDisabled={false}
            favoritesOnly={isFavoritesOnly}
            setFavoritesOnly={setIsFavoritesOnly}
            tagFilters={tagFilters}
            setTagFilters={setTagFilters}
            tagOptions={tagOptions}
            onReset={resetFilters}
          />
        )}
        <section className={styles['grid-area']}>
          <aside className={styles['left-rail']} aria-label="表示操作">
            <nav className={styles['left-rail-controls']} aria-label="表示操作一覧">
              {isEditWorkspaceScreen ? (
                <section className={styles['left-rail-section']} aria-labelledby="left-rail-screen">
                  <h2 id="left-rail-screen" className={styles['left-rail-section-title']}>
                    画面
                  </h2>
                  <div className={styles['left-rail-nav-group']} role="group" aria-label="画面">
                    <button
                      className={[styles['left-rail-button'], isGalleryScreen ? styles.active : '']
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setActiveMainScreen('gallery');
                      }}
                      aria-label="ギャラリー"
                      title="ギャラリー"
                      type="button"
                    >
                      <span className={styles['left-rail-icon']}>
                        <AppIcon name={APP_ICON_NAMES.photo} />
                      </span>
                      <span className={styles['left-rail-label']}>ギャラリー</span>
                    </button>
                    <button
                      className={[
                        styles['left-rail-button'],
                        isTagMasterScreen ? styles.active : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setActiveMainScreen((prev) =>
                          prev === 'tagMaster' ? 'gallery' : 'tagMaster',
                        );
                      }}
                      aria-label="タグマスタ編集"
                      title="タグマスタ編集"
                      type="button"
                    >
                      <span className={styles['left-rail-icon']}>
                        <AppIcon name={APP_ICON_NAMES.tag} />
                      </span>
                      <span className={styles['left-rail-label']}>タグマスタ編集</span>
                    </button>
                    <button
                      className={[styles['left-rail-button'], isTemplateScreen ? styles.active : '']
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setActiveMainScreen((prev) =>
                          prev === 'template' ? 'gallery' : 'template',
                        );
                      }}
                      aria-label="テンプレート編集"
                      title="テンプレート編集"
                      type="button"
                    >
                      <span className={styles['left-rail-icon']}>
                        <AppIcon name={APP_ICON_NAMES.template} />
                      </span>
                      <span className={styles['left-rail-label']}>テンプレート編集</span>
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section
                    className={styles['left-rail-section']}
                    aria-labelledby="left-rail-screen"
                  >
                    <h2 id="left-rail-screen" className={styles['left-rail-section-title']}>
                      画面
                    </h2>
                    <div className={styles['left-rail-nav-group']} role="group" aria-label="画面">
                      <button
                        className={[
                          styles['left-rail-button'],
                          isGalleryScreen ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setActiveMainScreen('gallery');
                        }}
                        aria-label="ギャラリー"
                        title="ギャラリー"
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.photo} />
                        </span>
                        <span className={styles['left-rail-label']}>ギャラリー</span>
                      </button>
                    </div>
                  </section>
                  <section className={styles['left-rail-section']} aria-labelledby="left-rail-edit">
                    <h2 id="left-rail-edit" className={styles['left-rail-section-title']}>
                      編集
                    </h2>
                    <div className={styles['left-rail-nav-group']} role="group" aria-label="編集">
                      <button
                        className={[
                          styles['left-rail-button'],
                          isSelectionMode ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setIsSelectionMode((prev) => {
                            if (prev) {
                              clearSelectedPhotos();
                            }
                            return !prev;
                          });
                        }}
                        aria-label="複数選択モード"
                        title="複数選択モード"
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.selectMultiple} />
                        </span>
                        <span className={styles['left-rail-label']}>複数選択</span>
                      </button>
                      <button
                        className={[
                          styles['left-rail-button'],
                          isTagMasterScreen ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setActiveMainScreen((prev) =>
                            prev === 'tagMaster' ? 'gallery' : 'tagMaster',
                          );
                        }}
                        aria-label="タグマスタ編集"
                        title="タグマスタ編集"
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.tag} />
                        </span>
                        <span className={styles['left-rail-label']}>タグマスタ編集</span>
                      </button>
                      <button
                        className={[
                          styles['left-rail-button'],
                          isTemplateScreen ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setActiveMainScreen((prev) =>
                            prev === 'template' ? 'gallery' : 'template',
                          );
                        }}
                        aria-label="テンプレート編集"
                        title="テンプレート編集"
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.template} />
                        </span>
                        <span className={styles['left-rail-label']}>テンプレート編集</span>
                      </button>
                    </div>
                  </section>
                  <section
                    className={styles['left-rail-section']}
                    aria-labelledby="left-rail-grouping"
                  >
                    <h2 id="left-rail-grouping" className={styles['left-rail-section-title']}>
                      グループ化
                    </h2>
                    <div
                      className={styles['left-rail-nav-group']}
                      role="group"
                      aria-label="グループ化"
                    >
                      <button
                        className={[
                          styles['left-rail-button'],
                          groupingMode === 'none' ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setGroupingMode('none');
                        }}
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.group} />
                        </span>
                        <span className={styles['left-rail-label']}>なし</span>
                      </button>
                      <button
                        className={[
                          styles['left-rail-button'],
                          groupingMode === 'similar' ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setGroupingMode('similar');
                        }}
                        disabled={!isSimilarGroupingAvailable}
                        title={
                          isSimilarGroupingAvailable
                            ? '隣接画像の類似度でまとめる'
                            : '似た写真の準備が終わるまで使えません'
                        }
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.sparkles} />
                        </span>
                        <span className={styles['left-rail-label']}>似た写真</span>
                      </button>
                      <button
                        className={[
                          styles['left-rail-button'],
                          groupingMode === 'world' ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setGroupingMode('world');
                        }}
                        type="button"
                      >
                        <span className={styles['left-rail-icon']}>
                          <AppIcon name={APP_ICON_NAMES.globe} />
                        </span>
                        <span className={styles['left-rail-label']}>ワールド</span>
                      </button>
                    </div>
                  </section>
                  {isGalleryScreen && (
                    <section
                      className={styles['left-rail-section']}
                      aria-labelledby="left-rail-view-mode"
                    >
                      <h2 id="left-rail-view-mode" className={styles['left-rail-section-title']}>
                        表示形式
                      </h2>
                      <div
                        className={styles['left-rail-nav-group']}
                        role="group"
                        aria-label="表示形式"
                      >
                        <button
                          className={[
                            styles['left-rail-button'],
                            viewMode === 'standard' ? styles.active : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => void handleViewModeChange('standard')}
                          aria-label="グリッド"
                          title="グリッド"
                          type="button"
                        >
                          <span className={styles['left-rail-icon']}>
                            <AppIcon name={APP_ICON_NAMES.grid} />
                          </span>
                          <span className={styles['left-rail-label']}>グリッド</span>
                        </button>
                        <button
                          className={[
                            styles['left-rail-button'],
                            viewMode === 'gallery' ? styles.active : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => void handleViewModeChange('gallery')}
                          aria-label="ギャラリー"
                          title="ギャラリー"
                          type="button"
                        >
                          <span className={styles['left-rail-icon']}>
                            <AppIcon name={APP_ICON_NAMES.gallery} />
                          </span>
                          <span className={styles['left-rail-label']}>ギャラリー</span>
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </nav>
          </aside>

          <section
            className={styles['right-panel']}
            ref={rightPanelRef}
            aria-label={rightPanelLabel}
          >
            {isGalleryScreen &&
              scanStatus !== 'scanning' &&
              !isLoading &&
              filteredPhotos.length === 0 && (
                <EmptyState
                  isFiltering={
                    !!searchQuery ||
                    worldFilters.length > 0 ||
                    !!dateFrom ||
                    !!dateTo ||
                    isFavoritesOnly ||
                    tagFilters.length > 0 ||
                    orientationFilter !== 'all'
                  }
                />
              )}

            {isGalleryScreen && (
              <>
                <section
                  ref={gridWrapperRef}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    paddingBottom: isSelectionMode && selectedCount > 0 ? 92 : 0,
                  }}
                >
                  <PhotoGrid
                    photos={displayPhotoItems}
                    viewMode={viewMode}
                    scrollTop={scrollTop}
                    columnCount={columnCount}
                    columnWidth={standardColumnWidth}
                    totalRows={displayTotalRows}
                    ROW_HEIGHT={ROW_HEIGHT}
                    gridHeight={gridHeight}
                    panelWidth={panelWidth}
                    handleGridScroll={handleGridScroll}
                    handleGridWheel={handleGridWheel}
                    totalHeight={totalHeight}
                    galleryLayout={galleryLayout}
                    cellProps={{ ...cellProps, data: displayPhotoItems }}
                    onGridRef={onGridRef}
                  />
                </section>
                {isSelectionMode && selectedCount > 0 && (
                  <div
                    className={styles['bulk-selection-bar']}
                    role="region"
                    aria-label="複数選択アクション"
                  >
                    <p className={styles['bulk-selection-count']}>{selectedCount}件選択中</p>
                    <div
                      className={styles['bulk-selection-actions']}
                      role="group"
                      aria-label="一括操作"
                    >
                      <button
                        className={[
                          styles['bulk-selection-button'],
                          shouldEnableBulkFavorite ? styles.primary : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => void handleBulkFavorite()}
                        type="button"
                      >
                        {shouldEnableBulkFavorite ? '一括お気に入り' : '一括お気に入り解除'}
                      </button>
                      <button
                        className={styles['bulk-selection-button']}
                        onClick={openBulkTagModal}
                        type="button"
                      >
                        一括タグ付け
                      </button>
                      <button
                        className={styles['bulk-selection-button']}
                        onClick={() => void handleBulkCopy()}
                        type="button"
                      >
                        一括別フォルダコピー
                      </button>
                    </div>
                    <button
                      className={styles['bulk-selection-dismiss']}
                      onClick={clearSelectedPhotos}
                      aria-label="選択を解除"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                )}
              </>
            )}

            {activeMainScreen === 'settings' && (
              <SettingsWorkspace
                photoFolderPath={photoFolderPath}
                secondaryPhotoFolderPath={secondaryPhotoFolderPath}
                onChooseFolder={onChooseFolder}
                startupEnabled={isStartupEnabled}
                onToggleStartup={() => {
                  void handleStartupPreference(!isStartupEnabled);
                }}
                themeMode={themeMode}
                onToggleTheme={handleThemeToggle}
                isArchiveResolutionRunning={isArchiveResolutionRunning}
                isSimilarResolutionRunning={isSimilarResolutionRunning}
                onResolveUnknownWorldsFromArchive={() => {
                  void handleResolveUnknownWorldsFromArchive();
                }}
                onResolveUnknownWorldsFromSimilarPhotos={(target) => {
                  setSimilarResolutionTarget(target);
                  setIsSimilarResolutionConfirmOpen(true);
                }}
              />
            )}

            {activeMainScreen === 'tagMaster' && (
              <TagMasterWorkspace
                masterTags={masterTags}
                onCreateTagMaster={createTagMaster}
                onDeleteTagMaster={deleteTagMaster}
              />
            )}

            {activeMainScreen === 'template' && (
              <TweetTemplateWorkspace
                tweetTemplateDraft={tweetTemplateDraft}
                setTweetTemplateDraft={setTweetTemplateDraft}
                editingTweetTemplate={editingTweetTemplate}
                handleCancelTweetTemplateEdit={handleCancelTweetTemplateEdit}
                handleSaveTweetTemplate={handleSaveTweetTemplate}
                tweetTemplates={tweetTemplates}
                activeTweetTemplate={activeTweetTemplate}
                handleSelectTweetTemplate={handleSelectTweetTemplate}
                handleStartTweetTemplateEdit={handleStartTweetTemplateEdit}
                handleDeleteTweetTemplate={handleDeleteTweetTemplate}
              />
            )}
          </section>

          {isGalleryScreen && groupingMode === 'none' && sortMode === 'capturedAtDesc' && (
            <MonthNav
              monthsByYear={monthsByYear}
              monthGroups={monthGroups}
              activeMonthIndex={activeMonthIndex}
              scrollTop={scrollTop}
              maxScrollTop={maxScrollTop}
              handleJumpToRatio={handleJumpToRatio}
            />
          )}
        </section>
      </main>

      {isBulkTagModalOpen && (
        <>
          <button
            className={styles.overlay}
            onClick={() => {
              setIsBulkTagModalOpen(false);
            }}
            aria-label="一括タグ付けモーダルを閉じる"
            type="button"
          />
          <section
            className={[styles.modal, styles['quick-tag-modal']].join(' ')}
            aria-modal="true"
            role="dialog"
            aria-labelledby="bulk-tag-title"
          >
            <button
              className={styles.close}
              onClick={() => {
                setIsBulkTagModalOpen(false);
              }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className={[styles['modal-body'], styles['single-column']].join(' ')}>
              <section className={styles['modal-info']} aria-labelledby="bulk-tag-title">
                <header className={styles['info-header']}>
                  <h2 id="bulk-tag-title">一括タグ付け</h2>
                </header>
                <div className={styles['quick-tag-body']}>
                  <p>{selectedCount}件の写真へ追加するタグを選択してください。</p>
                  <label className={styles['quick-tag-label']} htmlFor="bulk-tag-select">
                    既存タグ
                  </label>
                  <div className={styles['tag-select-wrap']}>
                    <select
                      id="bulk-tag-select"
                      className={styles.select}
                      value={bulkTagSelection}
                      disabled={!hasMasterTags}
                      onChange={(event) => {
                        setBulkTagSelection(event.target.value);
                      }}
                    >
                      <option value="">
                        {hasMasterTags ? 'タグを選択...' : 'タグが登録されていません'}
                      </option>
                      {tagOptions.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className={styles['quick-tag-label']} htmlFor="bulk-tag-draft">
                    新規タグ
                  </label>
                  <input
                    id="bulk-tag-draft"
                    className={styles.input}
                    value={bulkTagDraft}
                    onChange={(event) => {
                      setBulkTagDraft(event.target.value);
                    }}
                    placeholder="新しいタグを入力..."
                  />
                  {!hasMasterTags && (
                    <div className={styles['empty-note']}>
                      <p>タグが登録されていません。タグマスタ編集画面でタグを追加してください。</p>
                      <button
                        className={styles['secondary-button']}
                        onClick={() => {
                          setIsBulkTagModalOpen(false);
                          setActiveMainScreen('tagMaster');
                        }}
                        type="button"
                      >
                        タグマスタ編集を開く
                      </button>
                    </div>
                  )}
                </div>
                <footer className={styles.actions}>
                  <button
                    className={styles['secondary-button']}
                    onClick={() => {
                      setIsBulkTagModalOpen(false);
                    }}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button className={styles['primary-button']} onClick={() => void applyBulkTag()}>
                    追加
                  </button>
                </footer>
              </section>
            </div>
          </section>
        </>
      )}

      {selectedPhotoView && (
        <PhotoModal
          photo={selectedPhotoView}
          allTags={masterTags}
          onClose={closePhotoModal}
          localMemo={localMemo}
          setLocalMemo={setLocalMemo}
          handleSaveMemo={handleSaveMemo}
          isSavingMemo={isSavingMemo}
          handleOpenWorld={handleOpenWorld}
          canGoBack={photoHistory.length > 0}
          onGoBack={goBackPhoto}
          canGoPrev={selectedPhotoIndex > 0}
          canGoNext={selectedPhotoIndex >= 0 && selectedPhotoIndex < displayPhotoItems.length - 1}
          onGoPrev={() => {
            if (selectedPhotoIndex > 0) {
              const previousItem = displayPhotoItems[selectedPhotoIndex - 1];
              setSelectedPhoto(previousItem.photo);
            }
          }}
          onGoNext={() => {
            if (selectedPhotoIndex >= 0 && selectedPhotoIndex < displayPhotoItems.length - 1) {
              const nextItem = displayPhotoItems[selectedPhotoIndex + 1];
              setSelectedPhoto(nextItem.photo);
            }
          }}
          similarPhotos={similarPhotos}
          showSimilarPhotos={groupingMode === 'similar'}
          onSelectSimilarPhoto={setSelectedPhoto}
          onToggleFavorite={() =>
            toggleFavorite(selectedPhotoView.photo_path, selectedPhotoView.is_favorite)
          }
          onTweet={() => void handleTweetPhoto(selectedPhotoView)}
          onAddTag={(tag) => addTag(selectedPhotoView.photo_path, tag)}
          onRemoveTag={(tag) => removeTag(selectedPhotoView.photo_path, tag)}
          onShowInExplorer={() => {
            void showInExplorer(selectedPhotoView.photo_path).catch((err: unknown) => {
              addToast(`エクスプローラーで表示できませんでした: ${String(err)}`, 'error');
            });
          }}
          onOpenTagMaster={() => {
            closePhotoModal();
            setActiveMainScreen('tagMaster');
          }}
        />
      )}
      {isSimilarResolutionConfirmOpen && (
        <>
          <button
            className={styles.overlay}
            onClick={() => {
              if (!isSimilarResolutionRunning) {
                setIsSimilarResolutionConfirmOpen(false);
              }
            }}
            aria-label="類似補完確認モーダルを閉じる"
            type="button"
          />
          <section
            className={[styles.modal, styles['folder-change-modal']].join(' ')}
            aria-modal="true"
            role="dialog"
            aria-labelledby="similar-resolution-title"
          >
            <button
              className={styles.close}
              onClick={() => {
                if (!isSimilarResolutionRunning) {
                  setIsSimilarResolutionConfirmOpen(false);
                }
              }}
              aria-label="閉じる"
              type="button"
            >
              ×
            </button>
            <div className={[styles['modal-body'], styles['single-column']].join(' ')}>
              <section className={styles['modal-info']} aria-labelledby="similar-resolution-title">
                <header className={styles['info-header']}>
                  <h2 id="similar-resolution-title">類似写真から補完</h2>
                </header>
                <section className={styles.warning} aria-label="補完対象の確認">
                  <strong>補完対象の優先順を確認してください。</strong>
                  <p>
                    類似写真からワールド不明を補完します。まずどの写真群を優先して対象にするかを選べます。
                  </p>
                </section>
                <div className={styles['quick-tag-body']}>
                  <label className={styles['quick-tag-label']} htmlFor="similar-resolution-target">
                    補完対象の優先順
                  </label>
                  <div className={styles['tag-select-wrap']}>
                    <select
                      id="similar-resolution-target"
                      className={styles.select}
                      value={similarResolutionTarget}
                      onChange={(event) => {
                        setSimilarResolutionTarget(event.target.value as SimilarResolutionTarget);
                      }}
                    >
                      <option value="all">全体を対象にする</option>
                      <option value="primary">1st フォルダを先に補完する</option>
                      <option value="secondary">2nd フォルダを先に補完する</option>
                    </select>
                  </div>
                </div>
                <footer className={styles.actions}>
                  <button
                    className={styles['secondary-button']}
                    onClick={() => {
                      setIsSimilarResolutionConfirmOpen(false);
                    }}
                    disabled={isSimilarResolutionRunning}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className={styles['primary-button']}
                    onClick={() => {
                      void handleResolveUnknownWorldsFromSimilarPhotos(
                        similarResolutionTarget,
                      ).finally(() => {
                        setIsSimilarResolutionConfirmOpen(false);
                      });
                    }}
                    disabled={isSimilarResolutionRunning}
                    type="button"
                  >
                    {isSimilarResolutionRunning ? '補完中...' : '補完を開始'}
                  </button>
                </footer>
              </section>
            </div>
          </section>
        </>
      )}
      {pendingFolderPath && (
        <>
          <button
            className={styles.overlay}
            onClick={() => {
              if (!isApplyingFolderChange) {
                setPendingFolderPath(null);
              }
            }}
            aria-label="フォルダ変更確認モーダルを閉じる"
            type="button"
          />
          <section
            className={[styles.modal, styles['folder-change-modal']].join(' ')}
            aria-modal="true"
            role="dialog"
            aria-labelledby="folder-change-title"
          >
            <button
              className={styles.close}
              onClick={() => {
                if (!isApplyingFolderChange) {
                  setPendingFolderPath(null);
                }
              }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className={[styles['modal-body'], styles['single-column']].join(' ')}>
              <section className={styles['modal-info']} aria-labelledby="folder-change-title">
                <header className={styles['info-header']}>
                  <h2 id="folder-change-title">フォルダ変更の確認</h2>
                </header>
                <section className={styles.warning} aria-label="警告">
                  <strong>現在のデータはすべてリセットされます。</strong>
                  <p>
                    写真一覧、タグ、お気に入り、メモ、サムネイルキャッシュ、ログを削除してから新しいフォルダをスキャンします。
                  </p>
                  <p>変更先: {pendingFolderPath}</p>
                </section>
                <footer className={styles.actions}>
                  <button
                    className={styles['secondary-button']}
                    onClick={() => {
                      setPendingFolderPath(null);
                    }}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className={styles['primary-button']}
                    onClick={() => void applyFolderChange(pendingFolderPath, true)}
                    disabled={isApplyingFolderChange}
                  >
                    {isApplyingFolderChange ? '切替中...' : 'リセットして続行'}
                  </button>
                </footer>
              </section>
            </div>
          </section>
        </>
      )}
      {pendingRestoreCandidate && (
        <>
          <button
            className={styles.overlay}
            onClick={() => {
              if (!isApplyingFolderChange) {
                setPendingRestoreCandidate(null);
              }
            }}
            aria-label="キャッシュ復元モーダルを閉じる"
            type="button"
          />
          <section
            className={[styles.modal, styles['folder-change-modal']].join(' ')}
            aria-modal="true"
            role="dialog"
            aria-labelledby="backup-restore-title"
          >
            <button
              className={styles.close}
              onClick={() => {
                if (!isApplyingFolderChange) {
                  setPendingRestoreCandidate(null);
                }
              }}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className={[styles['modal-body'], styles['single-column']].join(' ')}>
              <section className={styles['modal-info']} aria-labelledby="backup-restore-title">
                <header className={styles['info-header']}>
                  <h2 id="backup-restore-title">バックアップデータの確認</h2>
                </header>
                <section
                  className={[styles.warning, styles.backup].join(' ')}
                  aria-label="バックアップ情報"
                >
                  <strong>バックアップデータがあります。反映させますか？</strong>
                  <p>対象パス: {pendingRestoreCandidate.photo_folder_path}</p>
                  <p>バックアップ作成日時: {pendingRestoreCandidate.created_at}</p>
                  <p>※ 復元できるデータは、ファイル名が DB と一致しているデータに限ります。</p>
                </section>
                <footer className={styles.actions}>
                  <button
                    className={styles['secondary-button']}
                    onClick={() => {
                      void finalizeFolderSelection(
                        pendingRestoreCandidate.photo_folder_path,
                        false,
                      );
                    }}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    使わない
                  </button>
                  <button
                    className={styles['primary-button']}
                    onClick={() => {
                      void finalizeFolderSelection(pendingRestoreCandidate.photo_folder_path, true);
                    }}
                    disabled={isApplyingFolderChange}
                  >
                    {isApplyingFolderChange ? '反映中...' : '反映する'}
                  </button>
                </footer>
              </section>
            </div>
          </section>
        </>
      )}
      <aside className={styles['toast-container']} aria-live="polite" aria-label="通知">
        {toasts.map((toast) => (
          <article key={toast.id} className={styles.toast}>
            <div className={styles['toast-icon']}>★</div>
            <p className={styles['toast-msg']}>{toast.msg}</p>
          </article>
        ))}
      </aside>
    </section>
  );
}

export default GalleryScreen;
