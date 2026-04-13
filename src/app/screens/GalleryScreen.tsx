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
import { SettingsModal } from '../../features/settings/views/SettingsModal';
import { FilterSidebar } from '../../features/filter/views/FilterSidebar';
import { ScanningOverlay } from '../../features/scan/views/ScanningOverlay';
import { Icons } from '../../shared/components/Icons';
import type { PhotoQuery } from '../../features/photo/models/types';
import type { DisplayPhotoItem } from '../../shared/models/types';
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
const MAX_SIMILAR_PHOTOS_IN_MODAL = 24;

/** Main gallery screen that composes scanning, filtering, browsing, and editing flows. */
function GalleryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');

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
    isSettingsOpen,
    setIsSettingsOpen,
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
    handleChooseFolder,
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
    isTweetTemplatePanelOpen,
    setIsTweetTemplatePanelOpen,
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
  const hasAllPHashesReady = useMemo(
    () => photos.every((photo) => Boolean(photo.phash?.trim())),
    [photos],
  );
  const isSimilarGroupingAvailable = !isPhashRunning && hasAllPHashesReady;

  const displayPhotos = useMemo(() => filteredPhotos, [filteredPhotos]);
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
      onSelectPhoto(item.photo);
    },
    [onSelectPhoto],
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
    const names = Array.from(new Set(photos.map((photo) => photo.world_name || ''))).sort();
    return names.some((name) => !!name.trim()) ? names : [];
  }, [photos]);
  const worldCounts = useMemo(
    () =>
      photos.reduce<Record<string, number>>((acc, photo) => {
        const key = photo.world_name || 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [photos],
  );
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
      showTags: selectedCount > 0,
      columnCount,
    }),
    [
      displayPhotoItems,
      handlePhotoActivate,
      toggleSelectedPhoto,
      columnCount,
      selectedPhotoPathSet,
      selectedCount,
    ],
  );
  const displayTotalRows = Math.ceil(displayPhotoItems.length / columnCount);

  return (
    <section
      className={[styles.root, themeMode === 'dark' ? 'dark-theme' : 'light-theme'].join(' ')}
    >
      <Header
        onRefresh={() => {
          if (scanStatus === 'scanning') {
            void cancelScan();
            return;
          }
          void startScan();
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
        onToggleFilters={() => {
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
        {isFilterOpen && (
          <button
            className={styles.backdrop}
            onClick={() => {
              setIsFilterOpen(false);
            }}
            aria-label="絞り込みを閉じる"
          />
        )}
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
          orientationFilterDisabled={false}
          favoritesOnly={isFavoritesOnly}
          setFavoritesOnly={setIsFavoritesOnly}
          tagFilters={tagFilters}
          setTagFilters={setTagFilters}
          tagOptions={tagOptions}
          onReset={resetFilters}
        />
        <section className={styles['grid-area']}>
          <aside className={styles['left-rail']} aria-label="表示操作">
            <nav className={styles['left-rail-controls']} aria-label="表示操作一覧">
              <section className={styles['left-rail-section']} aria-labelledby="left-rail-edit">
                <h2 id="left-rail-edit" className={styles['left-rail-section-title']}>
                  編集
                </h2>
                <div className={styles['left-rail-nav-group']} role="group" aria-label="編集">
                  <button
                    className={styles['left-rail-button']}
                    onClick={() => {
                      setIsSettingsOpen(true);
                    }}
                    aria-label="タグマスタ編集"
                    title="タグマスタ編集"
                    type="button"
                  >
                    <span className={styles['left-rail-icon']}>
                      <Icons.Tag />
                    </span>
                    <span className={styles['left-rail-label']}>タグマスタ編集</span>
                  </button>
                  <button
                    className={styles['left-rail-button']}
                    onClick={() => {
                      setIsTweetTemplatePanelOpen(true);
                    }}
                    aria-label="テンプレート編集"
                    title="テンプレート編集"
                    type="button"
                  >
                    <span className={styles['left-rail-icon']}>
                      <Icons.Template />
                    </span>
                    <span className={styles['left-rail-label']}>テンプレート編集</span>
                  </button>
                </div>
              </section>
              <section className={styles['left-rail-section']} aria-labelledby="left-rail-grouping">
                <h2 id="left-rail-grouping" className={styles['left-rail-section-title']}>
                  グループ化
                </h2>
                <div className={styles['left-rail-nav-group']} role="group" aria-label="グループ化">
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
                      <Icons.Stack />
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
                      <Icons.Sparkles />
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
                      <Icons.Globe />
                    </span>
                    <span className={styles['left-rail-label']}>ワールド</span>
                  </button>
                </div>
              </section>
              <section
                className={styles['left-rail-section']}
                aria-labelledby="left-rail-view-mode"
              >
                <h2 id="left-rail-view-mode" className={styles['left-rail-section-title']}>
                  表示形式
                </h2>
                <div className={styles['left-rail-nav-group']} role="group" aria-label="表示形式">
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
                      <Icons.Grid />
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
                      <Icons.Gallery />
                    </span>
                    <span className={styles['left-rail-label']}>ギャラリー</span>
                  </button>
                </div>
              </section>
            </nav>
          </aside>

          <section className={styles['right-panel']} ref={rightPanelRef} aria-label="写真一覧">
            {scanStatus !== 'scanning' && !isLoading && filteredPhotos.length === 0 && (
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

            <section
              ref={gridWrapperRef}
              style={{ flex: 1, minHeight: 0, paddingBottom: selectedCount > 0 ? 92 : 0 }}
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
            {selectedCount > 0 && (
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
          </section>

          {groupingMode === 'none' && (
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
                  <label className="quick-tag-modal-label" htmlFor="bulk-tag-draft">
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
                      タグが登録されていません。設定画面でタグを追加してください。
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
        />
      )}

      {isTweetTemplatePanelOpen && (
        <>
          <button
            className={styles.overlay}
            onClick={() => {
              setIsTweetTemplatePanelOpen(false);
            }}
            aria-label="投稿テンプレートモーダルを閉じる"
            type="button"
          />
          <section
            className={[styles.modal, styles['tweet-template-panel']].join(' ')}
            aria-modal="true"
          >
            <button
              className={styles.close}
              onClick={() => {
                setIsTweetTemplatePanelOpen(false);
                handleCancelTweetTemplateEdit();
              }}
              aria-label="閉じる"
              type="button"
            >
              ×
            </button>
            <div className={styles['tweet-template-modal-body']}>
              <section className={styles['modal-info']} aria-labelledby="tweet-template-edit-title">
                <header className={styles['info-header']}>
                  <h2 id="tweet-template-edit-title">投稿テンプレート</h2>
                </header>
                <section className={styles['memo-section']} aria-label="テンプレート編集">
                  <label>{editingTweetTemplate ? 'テンプレート編集' : '新規テンプレート'}</label>
                  <textarea
                    className={styles.textarea}
                    value={tweetTemplateDraft}
                    onChange={(event) => {
                      setTweetTemplateDraft(event.target.value);
                    }}
                    placeholder={`例:\nWorld: {world-name}\nAuthor:\n\n#VRChat_world紹介`}
                  />
                  <p className={styles['tweet-template-help']}>使える置換: {'{world-name}'}</p>
                  <footer className={styles['tweet-template-editor-actions']}>
                    {editingTweetTemplate && (
                      <button
                        className={styles['secondary-button']}
                        onClick={handleCancelTweetTemplateEdit}
                        type="button"
                      >
                        キャンセル
                      </button>
                    )}
                    <button
                      className={styles['primary-button']}
                      onClick={() => void handleSaveTweetTemplate()}
                      type="button"
                    >
                      {editingTweetTemplate ? '更新' : '登録'}
                    </button>
                  </footer>
                </section>
              </section>
              <section
                className={[styles['modal-info'], styles['tweet-template-list-panel']].join(' ')}
                aria-labelledby="tweet-template-list-title"
              >
                <header className={styles['info-header']}>
                  <h2 id="tweet-template-list-title">テンプレート一覧</h2>
                </header>
                <section className={styles['memo-section']} aria-label="登録済みテンプレート">
                  <label>登録済みテンプレート</label>
                  <ul className={styles['tweet-template-list']}>
                    {tweetTemplates.map((template) => (
                      <li
                        key={template}
                        className={[
                          styles['tweet-template-item'],
                          template === activeTweetTemplate ? styles.active : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <button
                          className={styles['tweet-template-select']}
                          onClick={() => void handleSelectTweetTemplate(template)}
                          type="button"
                        >
                          <span className={styles['tweet-template-item-title']}>
                            {template === activeTweetTemplate ? '使用中' : 'テンプレート'}
                          </span>
                          <span className={styles['tweet-template-item-body']}>{template}</span>
                        </button>
                        <footer
                          className={styles['tweet-template-item-actions']}
                          role="group"
                          aria-label="テンプレート操作"
                        >
                          <button
                            className={styles['secondary-button']}
                            onClick={() => {
                              handleStartTweetTemplateEdit(template);
                            }}
                            type="button"
                          >
                            編集
                          </button>
                          <button
                            className={styles['danger-button']}
                            onClick={() => void handleDeleteTweetTemplate(template)}
                            type="button"
                          >
                            削除
                          </button>
                        </footer>
                      </li>
                    ))}
                  </ul>
                </section>
              </section>
            </div>
          </section>
        </>
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => {
            setIsSettingsOpen(false);
          }}
          photoFolderPath={photoFolderPath}
          secondaryPhotoFolderPath={secondaryPhotoFolderPath}
          handleChooseFolder={handleChooseFolder}
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
          onResolveUnknownWorldsFromSimilarPhotos={() => {
            void handleResolveUnknownWorldsFromSimilarPhotos();
          }}
          masterTags={masterTags}
          onCreateTagMaster={createTagMaster}
          onDeleteTagMaster={deleteTagMaster}
        />
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
