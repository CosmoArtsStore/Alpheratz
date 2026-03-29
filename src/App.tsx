import { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

import { usePhotos } from "./hooks/usePhotos";
import { useScan } from "./hooks/useScan";
import { useGridDimensions } from "./hooks/useGridDimensions";
import { useScroll } from "./hooks/useScroll";
import { useToasts } from "./hooks/useToasts";
import { usePhotoActions } from "./hooks/usePhotoActions";
import { usePhashWorker } from "./hooks/usePhashWorker";
import { useSelectedPhotoRefs } from "./hooks/useSelectedPhotoRefs";

import { Header } from "./components/Header";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoModal } from "./components/PhotoModal";
import { SettingsModal } from "./components/SettingsModal";
import { TagMasterModal } from "./components/TagMasterModal";
import { TweetTemplatePanel } from "./components/TweetTemplatePanel";
import { FilterSidebar } from "./components/FilterSidebar";
import { ScanningOverlay } from "./components/ScanningOverlay";
import { EmptyState } from "./components/EmptyState";
import { Icons } from "./components/Icons";
import { DisplayPhotoItem, Photo, WorldFilterOption } from "./types";
import { buildDisplayPhotoItems, getDateRangeFromPreset, replaceTemplateToken } from "./utils/photoDisplay";
import { DETACH_AUXILIARY_RUNTIME_DATA, DETACH_RUNTIME_DATA } from "./config/runtimeFlags";

const CARD_WIDTH = 270;
const STANDARD_GRID_COLUMN_COUNT = 6;
const STANDARD_GRID_VISIBLE_ROW_COUNT = 4;
type DatePreset = "none" | "today" | "last7days" | "thisMonth" | "lastMonth" | "halfYear" | "oneYear" | "custom";
type ThemeMode = "light" | "dark";
type ViewMode = "standard" | "gallery";
type GroupingMode = "none" | "world";
type DisplayFolderMode = "all" | "primary" | "secondary";
type MainScreen = "gallery" | "settings" | "tagMaster" | "template";
type AppSetting = {
  photoFolderPath?: string;
  secondaryPhotoFolderPath?: string;
  enableStartup?: boolean;
  startupPreferenceSet?: boolean;
  themeMode?: ThemeMode;
  viewMode?: ViewMode;
  enableMasonryLayout?: boolean;
  tweetTemplates?: string[];
  activeTweetTemplate?: string;
};
type BackupCandidate = {
  photo_folder_path: string;
  backup_folder_name: string;
  created_at: string;
};
type PendingResetRequest = {
  slot: 1 | 2;
  path: string;
};
const MAX_SIMILAR_PHOTOS_IN_MODAL = 24;
const MAX_TAG_LENGTH = 40;

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
};

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [worldFilters, setWorldFilters] = useState<string[]>([]);
  const [activeMainScreen, setActiveMainScreen] = useState<MainScreen>("gallery");
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null);
  const [pendingFolderSlot, setPendingFolderSlot] = useState<1 | 2>(1);
  const [pendingRestoreCandidate, setPendingRestoreCandidate] = useState<BackupCandidate | null>(null);
  const [pendingResetRequest, setPendingResetRequest] = useState<PendingResetRequest | null>(null);
  const [isApplyingFolderChange, setIsApplyingFolderChange] = useState(false);
  const [startupEnabled, setStartupEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [isMasonryEnabled, setIsMasonryEnabled] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("none");
  const [orientationFilter, setOrientationFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [masterTags, setMasterTags] = useState<string[]>([]);
  const [worldFilterOptions, setWorldFilterOptions] = useState<WorldFilterOption[]>([]);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("none");
  const [displayFolderMode, setDisplayFolderMode] = useState<DisplayFolderMode>("all");
  const [viewPreparationLabel, setViewPreparationLabel] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoPaths, setSelectedPhotoPaths] = useState<string[]>([]);
  const [selectionAnchorPhotoPath, setSelectionAnchorPhotoPath] = useState<string | null>(null);
  const [bulkTagSelections, setBulkTagSelections] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [selectedBackendGroupPhotos, setSelectedBackendGroupPhotos] = useState<Photo[] | null>(null);
  const [tweetTemplates, setTweetTemplates] = useState<string[]>([]);
  const [activeTweetTemplate, setActiveTweetTemplate] = useState("");
  const [tweetTemplateDraft, setTweetTemplateDraft] = useState("");
  const [editingTweetTemplate, setEditingTweetTemplate] = useState<string | null>(null);
  const viewPreparationTokenRef = useRef(0);
  const pendingFolderPreparationRef = useRef<number | null>(null);
  const pendingGroupingPreparationRef = useRef<number | null>(null);
  const viewPreparationTimeoutRef = useRef<number | null>(null);
  const pendingModalPageNavigationRef = useRef<"next" | "prev" | null>(null);
  const { progress: pdqProgress, isRunning: isPdqRunning } = usePhashWorker();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { rightPanelRef, gridWrapperRef, panelWidth, gridHeight, columnCount: measuredColumnCount } = useGridDimensions(CARD_WIDTH);
  const { toasts, addToast } = useToasts();
  const isPagingActive = viewMode === "standard";
  const photoFilters = useMemo(() => ({
    searchQuery: debouncedQuery,
    worldFilters,
    dateFrom,
    dateTo,
    orientationFilter,
    favoritesOnly,
    tagFilters,
    includePhash: false,
    pagingEnabled: isPagingActive,
    viewMode,
    sourceSlot: displayFolderMode === "primary" ? 1 : (displayFolderMode === "secondary" ? 2 : null),
    groupingMode: DETACH_AUXILIARY_RUNTIME_DATA ? "none" : groupingMode,
  }), [debouncedQuery, worldFilters, dateFrom, dateTo, orientationFilter, favoritesOnly, tagFilters, groupingMode, isPagingActive, viewMode, displayFolderMode]);
  const {
    photos,
    visiblePhotos,
    displayItems: fetchedDisplayItems,
    setPhotos,
    loadPhotos,
    isLoading,
    isLoadingMore,
    isPageTransitioning,
    totalCount,
    pageIndex,
    pageSize,
    hasMorePhotos,
    hasPrevPage,
    hasNextPage,
    loadMorePhotos,
    goToPrevPage,
    goToNextPage,
  } = usePhotos(photoFilters, addToast);
  const {
    scanStatus,
    scanProgress,
    photoFolderPath,
    secondaryPhotoFolderPath,
    startScan,
    refreshSettings,
    cancelScan,
  } = useScan(addToast);

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
  } = usePhotoActions(addToast);

  const hasSecondaryFolder = !!secondaryPhotoFolderPath.trim();
  const displayPhotos = useMemo(() => (isPagingActive ? visiblePhotos : photos), [isPagingActive, photos, visiblePhotos]);
  const selectedPhotoPathSet = useMemo(() => new Set(selectedPhotoPaths), [selectedPhotoPaths]);
  const { selectedPhotoRefs, setSelectedPhotoRefs } = useSelectedPhotoRefs(selectedPhotoPaths, addToast);

  const displayPhotoItems = useMemo<DisplayPhotoItem[]>(() => {
    if (groupingMode === "world") {
      return fetchedDisplayItems;
    }
    return buildDisplayPhotoItems(displayPhotos);
  }, [displayPhotos, fetchedDisplayItems, groupingMode]);

  const selectedPhotoView = useMemo(() => {
    if (!selectedPhoto) {
      return null;
    }
    return displayPhotos.find((photo) => photo.photo_path === selectedPhoto.photo_path)
      ?? photos.find((photo) => photo.photo_path === selectedPhoto.photo_path)
      ?? selectedBackendGroupPhotos?.find((photo) => photo.photo_path === selectedPhoto.photo_path)
      ?? selectedPhoto;
  }, [selectedPhoto, displayPhotos, photos, selectedBackendGroupPhotos]);
  const selectedPhotoIndex = useMemo(() => (
    selectedPhotoView
      ? displayPhotoItems.findIndex((item) => (
        item.groupPhotos?.some((photo) => photo.photo_path === selectedPhotoView.photo_path)
        || item.photo.photo_path === selectedPhotoView.photo_path
      ))
      : -1
  ), [displayPhotoItems, selectedPhotoView]);
  const selectedGroupedPhotos = useMemo(() => {
    if (!selectedPhotoView) {
      return null;
    }

    if (groupingMode === "world") {
      return selectedBackendGroupPhotos;
    }

    return displayPhotoItems.find((item) => (
      item.groupPhotos?.some((photo) => photo.photo_path === selectedPhotoView.photo_path)
    ))?.groupPhotos ?? null;
  }, [groupingMode, selectedPhotoView, displayPhotoItems, selectedBackendGroupPhotos]);
  const modalGroupedPhotos = useMemo(
    () => selectedGroupedPhotos?.slice(0, MAX_SIMILAR_PHOTOS_IN_MODAL) ?? [],
    [selectedGroupedPhotos],
  );
  const showGroupedPhotosInModal = groupingMode === "world";
  const groupedPhotoLabel = "ワールド";
  const hasActiveTweetTemplate = activeTweetTemplate.trim().length > 0;
  const isGroupingUnavailableInMasonry = viewMode === "gallery";

  useEffect(() => {
    if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
      setSelectedBackendGroupPhotos(null);
      return;
    }
    if (groupingMode !== "world" || !selectedPhotoView) {
      setSelectedBackendGroupPhotos(null);
      return;
    }

    const selectedGroupKey = displayPhotoItems.find((item) => item.photo.photo_path === selectedPhotoView.photo_path)?.groupKey;
    if (!selectedGroupKey) {
      setSelectedBackendGroupPhotos(null);
      return;
    }

    let cancelled = false;
    invoke<Photo[]>("get_world_group_photos_cmd", {
        groupKey: selectedGroupKey,
        startDate: dateFrom || null,
        endDate: dateTo || null,
      sourceSlot: displayFolderMode === "primary" ? 1 : (displayFolderMode === "secondary" ? 2 : null),
      orientation: orientationFilter === "all" ? null : orientationFilter,
      favoritesOnly: favoritesOnly || null,
      tagFilters: tagFilters.length > 0 ? tagFilters : null,
    })
      .then((groupPhotos) => {
        if (!cancelled) {
          setSelectedBackendGroupPhotos(groupPhotos);
        }
      })
        .catch((err) => {
          if (!cancelled) {
            setSelectedBackendGroupPhotos(null);
            addToast(`ワールド写真一覧の読み込みに失敗しました: ${String(err)}`, "error");
          }
        });

    return () => {
      cancelled = true;
    };
  }, [
    addToast,
    dateFrom,
    dateTo,
    displayFolderMode,
    displayPhotoItems,
    favoritesOnly,
    groupingMode,
    orientationFilter,
    selectedPhotoView,
    tagFilters,
  ]);

  useEffect(() => {
    if (viewMode === "gallery" && groupingMode !== "none") {
      setGroupingMode("none");
    }
  }, [groupingMode, viewMode]);

  useEffect(() => {
    if (pendingModalPageNavigationRef.current && !isPageTransitioning && photos.length > 0) {
      const targetPhoto = pendingModalPageNavigationRef.current === "next"
        ? photos[0]
        : photos[photos.length - 1];
      pendingModalPageNavigationRef.current = null;
      if (targetPhoto) {
        setSelectedPhoto(targetPhoto);
      }
    }
  }, [isPageTransitioning, photos, setSelectedPhoto]);

  useEffect(() => {
    const isSelectedPhotoVisible = photos.some((photo) => photo.photo_path === selectedPhoto?.photo_path)
        || selectedBackendGroupPhotos?.some((photo) => photo.photo_path === selectedPhoto?.photo_path);

    if (selectedPhoto && !isSelectedPhotoVisible && !pendingModalPageNavigationRef.current) {
      closePhotoModal();
    }
  }, [closePhotoModal, photos, selectedPhoto, selectedBackendGroupPhotos]);

  useEffect(() => {
    if (selectionAnchorPhotoPath && !photos.some((photo) => photo.photo_path === selectionAnchorPhotoPath)) {
      setSelectionAnchorPhotoPath(null);
    }
  }, [photos, selectionAnchorPhotoPath]);

  useEffect(() => {
    if (displayFolderMode === "secondary" && !hasSecondaryFolder) {
      setDisplayFolderMode("all");
    }
  }, [displayFolderMode, hasSecondaryFolder]);

  useEffect(() => {
    if (pendingFolderPreparationRef.current === null || isLoading) {
      return;
    }

    const token = pendingFolderPreparationRef.current;
    const animationFrame = window.requestAnimationFrame(() => {
      if (pendingFolderPreparationRef.current === token) {
        pendingFolderPreparationRef.current = null;
        finishViewPreparation(token);
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isLoading]);

  useEffect(() => {
    if (pendingGroupingPreparationRef.current === null) {
      return;
    }

    const token = pendingGroupingPreparationRef.current;
    if (viewPreparationTimeoutRef.current !== null) {
      window.clearTimeout(viewPreparationTimeoutRef.current);
    }

    viewPreparationTimeoutRef.current = window.setTimeout(() => {
      if (pendingGroupingPreparationRef.current === token) {
        window.requestAnimationFrame(() => {
          if (pendingGroupingPreparationRef.current === token) {
            pendingGroupingPreparationRef.current = null;
            finishViewPreparation(token);
          }
        });
      }
      viewPreparationTimeoutRef.current = null;
    }, 220);

    return () => {
      if (viewPreparationTimeoutRef.current !== null) {
        window.clearTimeout(viewPreparationTimeoutRef.current);
        viewPreparationTimeoutRef.current = null;
      }
    };
  }, [displayPhotoItems, groupingMode]);

  useEffect(() => {
    return () => {
      clearPendingViewPreparations();
    };
  }, []);

  const updatePhoto = (photoPath: string, updater: (photo: Photo) => Photo) => {
    setPhotos((prev) => prev.map((photo) => (
      photo.photo_path === photoPath ? updater(photo) : photo
    )));
  };

  const beginViewPreparation = (label: string) => {
    const nextToken = viewPreparationTokenRef.current + 1;
    viewPreparationTokenRef.current = nextToken;
    setViewPreparationLabel(label);
    return nextToken;
  };

  const clearPendingViewPreparations = () => {
    pendingFolderPreparationRef.current = null;
    pendingGroupingPreparationRef.current = null;
    if (viewPreparationTimeoutRef.current !== null) {
      window.clearTimeout(viewPreparationTimeoutRef.current);
      viewPreparationTimeoutRef.current = null;
    }
  };

  const finishViewPreparation = (token: number) => {
    if (viewPreparationTokenRef.current === token) {
      setViewPreparationLabel(null);
    }
  };

  const prepareGroupingModeChange = (nextGroupingMode: GroupingMode) => {
    if (groupingMode === nextGroupingMode || viewPreparationLabel) {
      return;
    }

    clearPendingViewPreparations();
    const token = beginViewPreparation("表示を準備中...");
    pendingGroupingPreparationRef.current = token;
    window.setTimeout(() => {
      if (pendingGroupingPreparationRef.current === token) {
        setGroupingMode(nextGroupingMode);
      }
    }, 0);
  };

  const prepareDisplayFolderModeChange = (nextDisplayFolderMode: DisplayFolderMode) => {
    if (displayFolderMode === nextDisplayFolderMode || viewPreparationLabel) {
      return;
    }

    clearPendingViewPreparations();
    const token = beginViewPreparation("フォルダ表示を準備中...");
    pendingFolderPreparationRef.current = token;
    window.setTimeout(() => {
      if (pendingFolderPreparationRef.current === token) {
        setDisplayFolderMode(nextDisplayFolderMode);
      }
    }, 0);
  };

  const buildSettingPayload = (overrides: Partial<AppSetting> = {}): AppSetting => ({
    photoFolderPath,
    secondaryPhotoFolderPath,
    enableStartup: startupEnabled,
    themeMode,
    viewMode,
    enableMasonryLayout: isMasonryEnabled,
    tweetTemplates,
    activeTweetTemplate,
    ...overrides,
  });

  const toggleFavorite = async (photoPath: string, current: boolean) => {
    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    try {
      await invoke("set_photo_favorite_cmd", {
        photoPath,
        isFavorite: !current,
        sourceSlot: currentPhoto?.source_slot ?? 1,
      });
      updatePhoto(photoPath, (photo) => ({ ...photo, is_favorite: !current }));
    } catch (err) {
      addToast(`お気に入りの更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const addTag = async (photoPath: string, tag: string) => {
    const normalized = tag.trim();
    if (!normalized) {
      return;
    }
    if (normalized.length > MAX_TAG_LENGTH) {
      addToast(`タグは${MAX_TAG_LENGTH}文字以内で入力してください。`, "error");
      return;
    }

    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    if (currentPhoto?.tags.includes(normalized)) {
      return;
    }

    try {
      await invoke("add_photo_tag_cmd", {
        photoPath,
        tag: normalized,
        sourceSlot: currentPhoto?.source_slot ?? 1,
      });
      updatePhoto(photoPath, (photo) => ({
        ...photo,
        tags: [...photo.tags, normalized].sort((left, right) => left.localeCompare(right, "ja")),
      }));
      addToast("タグを追加しました。");
    } catch (err) {
      addToast(`タグの追加に失敗しました: ${String(err)}`, "error");
    }
  };

  const removeTag = async (photoPath: string, tag: string) => {
    const currentPhoto = photos.find((photo) => photo.photo_path === photoPath);
    try {
      await invoke("remove_photo_tag_cmd", {
        photoPath,
        tag,
        sourceSlot: currentPhoto?.source_slot ?? 1,
      });
      updatePhoto(photoPath, (photo) => ({
        ...photo,
        tags: photo.tags.filter((item) => item !== tag),
      }));
      addToast("タグを削除しました。");
    } catch (err) {
      addToast(`タグの削除に失敗しました: ${String(err)}`, "error");
    }
  };

  const applySimilarWorldMatch = async (sourcePhoto: Photo) => {
    if (!selectedPhotoView) {
      return;
    }

    try {
      await invoke("apply_world_match_from_photo_cmd", {
        targetPhotoPath: selectedPhotoView.photo_path,
        sourcePhotoPath: sourcePhoto.photo_path,
      });

      const nextWorldId = sourcePhoto.world_id ?? null;
      const nextWorldName = sourcePhoto.world_name ?? null;

      updatePhoto(selectedPhotoView.photo_path, (photo) => ({
        ...photo,
        world_id: nextWorldId,
        world_name: nextWorldName,
        match_source: "phash",
      }));
      setSelectedPhoto((prev) => (
        prev && prev.photo_path === selectedPhotoView.photo_path
          ? { ...prev, world_id: nextWorldId, world_name: nextWorldName, match_source: "phash" }
          : prev
      ));
      addToast("ワールド情報を反映しました。");
    } catch (err) {
      addToast(`ワールド情報の反映に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleStartUnknownWorldAnalysis = async () => {
    try {
      await invoke("start_unknown_world_pdq_analysis_cmd");
      addToast("ワールド不明写真の一括分析を開始しました");
    } catch (err) {
      addToast(`ワールド不明写真の一括分析を開始できませんでした: ${String(err)}`, "error");
    }
  };

  const toggleSelectedPhoto = (item: DisplayPhotoItem, shiftKey: boolean) => {
    const photoPath = item.photo.photo_path;
    if (shiftKey && selectionAnchorPhotoPath) {
      const anchorIndex = displayPhotoItems.findIndex((entry) => entry.photo.photo_path === selectionAnchorPhotoPath);
      const targetIndex = displayPhotoItems.findIndex((entry) => entry.photo.photo_path === photoPath);
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

    setSelectedPhotoPaths((prev) => (
      prev.includes(photoPath)
        ? prev.filter((currentPath) => currentPath !== photoPath)
        : [...prev, photoPath]
    ));
    setSelectionAnchorPhotoPath(photoPath);
  };

  const clearSelectedPhotos = () => {
    setSelectedPhotoPaths([]);
    setSelectionAnchorPhotoPath(null);
  };

  const handleToggleMultiSelectMode = () => {
    setIsMultiSelectMode((prev) => {
      if (prev) {
        clearSelectedPhotos();
      }
      return !prev;
    });
  };

  const handlePhotoActivate = (item: DisplayPhotoItem, shiftKey: boolean) => {
    if (isMultiSelectMode) {
      toggleSelectedPhoto(item, shiftKey);
      return;
    }

    onSelectPhoto(item.photo);
  };

  const resetFilters = () => {
    setWorldFilters([]);
    setDateFrom("");
    setDateTo("");
    setDatePreset("none");
    setOrientationFilter("all");
    setFavoritesOnly(false);
    setTagFilters([]);
  };

  const handleDatePresetSelect = (preset: Exclude<DatePreset, "none" | "custom">) => {
    const range = getDateRangeFromPreset(preset);
    setDatePreset(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const handleDateFromChange = (value: string) => {
    setDatePreset("custom");
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    setDatePreset("custom");
    setDateTo(value);
  };

  const standardColumnCount = viewMode === "standard" ? STANDARD_GRID_COLUMN_COUNT : measuredColumnCount;
  const standardColumnWidth = useMemo(
    () => Math.max(180, Math.floor(panelWidth / Math.max(1, standardColumnCount))),
    [panelWidth, standardColumnCount],
  );
  const standardRowHeight = useMemo(
    () => Math.max(150, Math.floor(gridHeight / STANDARD_GRID_VISIBLE_ROW_COUNT)),
    [gridHeight],
  );

  const {
    scrollTop,
    onGridRef,
    handleGridScroll,
    handleGridWheel,
  } = useScroll({
    photosLength: displayPhotoItems.length,
    columnCount: viewMode === "standard" ? standardColumnCount : measuredColumnCount,
    gridHeight,
    ROW_HEIGHT: standardRowHeight,
    disableProgrammaticBounds: viewMode === "gallery",
  });

  const finalizeFolderSelection = async (newPath: string, restoreBackup: boolean) => {
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          photoFolderPath: pendingFolderSlot === 1 ? newPath : photoFolderPath,
          secondaryPhotoFolderPath: pendingFolderSlot === 2 ? newPath : secondaryPhotoFolderPath,
        }),
      });

      if (restoreBackup) {
        await invoke("restore_cache_backup_cmd", { photoFolderPath: newPath });
      }

      await refreshSettings();
      await loadPhotos();
      await startScan();
      setPendingRestoreCandidate(null);
      setPendingFolderPath(null);
      addToast(restoreBackup ? "バックアップデータを反映して再スキャンを開始します" : "写真フォルダを更新しました");
    } catch (err) {
      addToast(`写真フォルダの切替に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleFinalizeFolderSelection = async (newPath: string, restoreBackup: boolean) => {
    setIsApplyingFolderChange(true);
    try {
      await finalizeFolderSelection(newPath, restoreBackup);
    } finally {
      setIsApplyingFolderChange(false);
    }
  };

  const applyFolderChange = async (newPath: string, createBackup: boolean) => {
    setIsApplyingFolderChange(true);
    try {
      const currentPath = pendingFolderSlot === 1 ? photoFolderPath : secondaryPhotoFolderPath;

      if (createBackup && currentPath) {
        await invoke("create_cache_backup_cmd", { photoFolderPath: currentPath });
      }

      if (pendingFolderSlot === 1) {
        await invoke("reset_photo_cache_cmd");
        setPhotos([]);
      } else {
        await invoke("reset_photo_cache_for_slot_cmd", { sourceSlot: 2 });
      }

      const backupCandidate = await invoke<BackupCandidate | null>("get_backup_candidate_cmd", {
        photoFolderPath: newPath,
      });
      setPendingFolderPath(null);
      if (backupCandidate) {
        setPendingRestoreCandidate(backupCandidate);
        addToast("関連するバックアップデータを検出しました。");
        return;
      }

      await finalizeFolderSelection(newPath, false);
    } catch (err) {
      addToast(`写真フォルダの更新に失敗しました: ${String(err)}`, "error");
    } finally {
      setIsApplyingFolderChange(false);
    }
  };

  const executeResetFolder = async (slot: 1 | 2, createBackup: boolean) => {
    const currentPath = slot === 1 ? photoFolderPath : secondaryPhotoFolderPath;
    if (!currentPath) {
      return;
    }

    const nextPrimaryPath = slot === 1 ? "" : photoFolderPath;
    const nextSecondaryPath = slot === 2 ? "" : secondaryPhotoFolderPath;

    setIsApplyingFolderChange(true);
    try {
      if (createBackup) {
        await invoke("create_cache_backup_cmd", { photoFolderPath: currentPath });
      }

      await invoke("reset_photo_cache_for_slot_cmd", { sourceSlot: slot });
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          photoFolderPath: nextPrimaryPath,
          secondaryPhotoFolderPath: nextSecondaryPath,
        }),
      });

      await refreshSettings();
      await loadPhotos();

      if (nextPrimaryPath || nextSecondaryPath) {
        await startScan();
      } else {
        setPhotos([]);
      }

      setPendingResetRequest(null);
      addToast(slot === 1 ? "1st 写真フォルダをリセットしました" : "2nd 写真フォルダをリセットしました");
    } catch (err) {
      addToast(`写真フォルダのリセットに失敗しました: ${String(err)}`, "error");
    } finally {
      setIsApplyingFolderChange(false);
    }
  };

  const promptFolderChange = (slot: 1 | 2, newPath: string) => {
    setPendingFolderSlot(slot);
    setPendingFolderPath(newPath);
    setPendingResetRequest(null);
  };

  const handleFolderChangeBackupDecision = async (createBackup: boolean) => {
    if (!pendingFolderPath) {
      return;
    }
    await applyFolderChange(pendingFolderPath, createBackup);
  };

  const handleResetBackupDecision = async (createBackup: boolean) => {
    if (!pendingResetRequest) {
      return;
    }
    await executeResetFolder(pendingResetRequest.slot, createBackup);
  };

  const handleChooseFolder = async (slot: 1 | 2) => {
    try {
      const selected = await open({ directory: true });
      if (!selected) {
        return;
      }

      const newPath = Array.isArray(selected) ? selected[0] : selected;
      const currentPath = slot === 1 ? photoFolderPath : secondaryPhotoFolderPath;
      if (newPath === currentPath) {
        return;
      }
      if (currentPath) {
        promptFolderChange(slot, newPath);
        return;
      }
      setPendingFolderSlot(slot);
      await applyFolderChange(newPath, false);
    } catch (err) {
      addToast(`写真フォルダの更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleResetFolder = async (slot: 1 | 2) => {
    const currentPath = slot === 1 ? photoFolderPath : secondaryPhotoFolderPath;
    if (!currentPath) {
      return;
    }
    setPendingFolderPath(null);
    setPendingResetRequest({ slot, path: currentPath });
  };

  const handleStartupPreference = async (enabled: boolean) => {
    try {
      await invoke("save_startup_preference_cmd", { enabled });
      setStartupEnabled(enabled);
      addToast(enabled ? "Alpheratz をログイン時に起動する設定にしました。" : "Alpheratz のログイン時起動を無効にしました。");
    } catch (err) {
      addToast(`自動起動設定の更新に失敗しました: ${String(err)}`, "error");
    }
  };

  useEffect(() => {
    if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
      setStartupEnabled(false);
      setThemeMode("light");
      setIsMasonryEnabled(false);
      setViewMode("standard");
      setTweetTemplates([]);
      setActiveTweetTemplate("");
      setMasterTags([]);
      setWorldFilterOptions([]);
      return;
    }

    const loadAppSetting = async () => {
      try {
        const setting = await invoke<AppSetting>("get_setting_cmd");
        const masonryEnabled = !!setting.enableMasonryLayout;
        setStartupEnabled(!!setting.enableStartup);
        setThemeMode(setting.themeMode === "dark" ? "dark" : "light");
        setIsMasonryEnabled(masonryEnabled);
        setViewMode(masonryEnabled && setting.viewMode === "gallery" ? "gallery" : "standard");
        const resolvedTemplates = setting.tweetTemplates ?? [];
        const resolvedActiveTemplate = resolvedTemplates.includes(setting.activeTweetTemplate ?? "")
          ? setting.activeTweetTemplate ?? ""
          : (resolvedTemplates[0] ?? "");
        setTweetTemplates(resolvedTemplates);
        setActiveTweetTemplate(resolvedActiveTemplate);
        await Promise.all([loadMasterTags(), loadWorldFilterOptions()]);
      } catch (err) {
        addToast(`設定の読み込みに失敗しました: ${String(err)}`, "error");
      }
    };

    loadAppSetting();
  }, []);

  useEffect(() => {
    if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
      setWorldFilterOptions([]);
      return;
    }
    void loadWorldFilterOptions();
  }, [photos.length]);

  const handleThemeToggle = async () => {
    const nextTheme: ThemeMode = themeMode === "dark" ? "light" : "dark";
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          themeMode: nextTheme,
        }),
      });
      setThemeMode(nextTheme);
    } catch (err) {
      addToast(`テーマ設定の更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleMasonryToggle = async () => {
    const nextMasonryEnabled = !isMasonryEnabled;
    const nextViewMode: ViewMode = nextMasonryEnabled ? viewMode : "standard";

    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          enableMasonryLayout: nextMasonryEnabled,
          viewMode: nextViewMode,
        }),
      });
      setIsMasonryEnabled(nextMasonryEnabled);
      setViewMode(nextViewMode);
    } catch (err) {
      addToast(`表示設定の更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const loadMasterTags = async () => {
    if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
      setMasterTags([]);
      return;
    }
    try {
      const tags = await invoke<string[]>("get_all_tags_cmd");
      setMasterTags(tags);
    } catch (err) {
      addToast(`タグマスタの読み込みに失敗しました: ${String(err)}`, "error");
    }
  };

  const loadWorldFilterOptions = async () => {
    if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
      setWorldFilterOptions([]);
      return;
    }
    try {
      const options = await invoke<WorldFilterOption[]>("get_world_filter_options_cmd");
      setWorldFilterOptions(options);
    } catch (err) {
      addToast(`ワールド一覧の読み込みに失敗しました: ${String(err)}`, "error");
    }
  };

  const createTagMaster = async (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) {
      return;
    }
    if (normalized.length > MAX_TAG_LENGTH) {
      addToast(`タグは${MAX_TAG_LENGTH}文字以内で入力してください。`, "error");
      return;
    }

    try {
      await invoke("create_tag_master_cmd", { tag: normalized });
      await loadMasterTags();
      addToast("タグマスタを追加しました。");
    } catch (err) {
      addToast(`タグマスタの追加に失敗しました: ${String(err)}`, "error");
    }
  };

  const deleteTagMaster = async (tag: string) => {
    try {
      await invoke("delete_tag_master_cmd", { tag });
      await loadMasterTags();
      addToast("タグマスタを削除しました。");
    } catch (err) {
      addToast(`タグマスタの削除に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleViewModeChange = async (nextViewMode: ViewMode) => {
    if (nextViewMode === "gallery" && !isMasonryEnabled) {
      return;
    }
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          viewMode: nextViewMode,
        }),
      });
      setViewMode(nextViewMode);
    } catch (err) {
      addToast(`表示形式の更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleAddTweetTemplate = async (template: string) => {
    const normalized = template.trim();
    if (!normalized) {
      addToast("ツイートテンプレートを入力してください。", "error");
      return;
    }

    if (tweetTemplates.includes(normalized)) {
      addToast("同じテンプレートは登録済みです。", "error");
      return;
    }

    const nextTemplates = [...tweetTemplates, normalized];
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          tweetTemplates: nextTemplates,
          activeTweetTemplate: activeTweetTemplate || normalized,
        }),
      });
      setTweetTemplates(nextTemplates);
      if (!activeTweetTemplate) {
        setActiveTweetTemplate(normalized);
      }
      addToast("ツイートテンプレートを登録しました。");
    } catch (err) {
      addToast(`ツイートテンプレートの保存に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleStartTweetTemplateEdit = (template: string) => {
    setEditingTweetTemplate(template);
    setTweetTemplateDraft(template);
  };

  const handleCancelTweetTemplateEdit = () => {
    setEditingTweetTemplate(null);
    setTweetTemplateDraft("");
  };

  const handleSaveTweetTemplate = async () => {
    const normalized = tweetTemplateDraft.trim();
    if (!normalized) {
      addToast("ツイートテンプレートを入力してください。", "error");
      return;
    }

    if (!editingTweetTemplate) {
      await handleAddTweetTemplate(normalized);
      setTweetTemplateDraft("");
      return;
    }

    if (editingTweetTemplate !== normalized && tweetTemplates.includes(normalized)) {
      addToast("同じテンプレートは登録済みです。", "error");
      return;
    }

    const nextTemplates = tweetTemplates.map((template) => (
      template === editingTweetTemplate ? normalized : template
    ));
    const nextActiveTemplate = activeTweetTemplate === editingTweetTemplate
      ? normalized
      : activeTweetTemplate;

    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          tweetTemplates: nextTemplates,
          activeTweetTemplate: nextActiveTemplate,
        }),
      });
      setTweetTemplates(nextTemplates);
      setActiveTweetTemplate(nextActiveTemplate);
      setEditingTweetTemplate(null);
      setTweetTemplateDraft("");
      addToast("ツイートテンプレートを更新しました。");
    } catch (err) {
      addToast(`ツイートテンプレートの更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleSelectTweetTemplate = async (template: string) => {
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          activeTweetTemplate: template,
        }),
      });
      setActiveTweetTemplate(template);
      addToast("投稿テンプレートを切り替えました。");
    } catch (err) {
      addToast(`投稿テンプレートの切替に失敗しました: ${String(err)}`, "error");
    }
  };

  const handleDeleteTweetTemplate = async (template: string) => {
    const nextTemplates = tweetTemplates.filter((item) => item !== template);
    const nextActiveTemplate = activeTweetTemplate === template ? (nextTemplates[0] ?? "") : activeTweetTemplate;
    try {
      await invoke("save_setting_cmd", {
        setting: buildSettingPayload({
          tweetTemplates: nextTemplates,
          activeTweetTemplate: nextActiveTemplate,
        }),
      });
      setTweetTemplates(nextTemplates);
      setActiveTweetTemplate(nextActiveTemplate);
      if (editingTweetTemplate === template) {
        setEditingTweetTemplate(null);
        setTweetTemplateDraft("");
      }
      addToast("ツイートテンプレートを削除しました。");
    } catch (err) {
      addToast(`ツイートテンプレートの削除に失敗しました: ${String(err)}`, "error");
    }
  };

  const buildTweetText = (photo: Photo) => {
    const world = photo.world_name?.trim() || "ワールド不明";
    const date = photo.timestamp ? photo.timestamp.slice(0, 16).replace("T", " ") : "";
    const memo = photo.memo?.trim() || "";
    const tags = photo.tags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ");
    const source = activeTweetTemplate.trim();

    if (!source) {
      return "";
    }

    return [
      ["{world}", world],
      ["{world-name}", world],
      ["{date}", date],
      ["{file}", photo.photo_filename],
      ["{memo}", memo],
      ["{tags}", tags],
    ].reduce((currentText, [token, value]) => replaceTemplateToken(currentText, token, value), source)
      .split("\n")
      .map((line: string) => line.trimEnd())
      .filter((line: string, index: number, lines: string[]) => line.length > 0 || (index > 0 && index < lines.length - 1))
      .join("\n")
      .trim();
  };

  const handleTweetPhoto = async (photo: Photo) => {
    const tweetText = buildTweetText(photo);
    if (!tweetText) {
      addToast("投稿テキストが空です。テンプレートを確認してください。", "error");
      return;
    }

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    try {
      await Promise.all([
        invoke("open_tweet_intent_cmd", { intentUrl }),
        invoke("show_in_explorer", { path: photo.photo_path }),
      ]);
    } catch (err) {
      addToast(`投稿ページを開けませんでした: ${String(err)}`, "error");
    }
  };

  const worldNameList = useMemo(
    () => worldFilterOptions.map((option) => option.world_name ?? ""),
    [worldFilterOptions],
  );
  const worldCounts = useMemo(() => (
    worldFilterOptions.reduce<Record<string, number>>((acc, option) => {
      const key = option.world_name ?? "unknown";
      acc[key] = option.count;
      return acc;
    }, {})
  ), [worldFilterOptions]);
  const tagOptions = useMemo(() => (
    masterTags.slice().sort((left, right) => left.localeCompare(right, "ja"))
  ), [masterTags]);
  const hasMasterTags = tagOptions.length > 0;
  const selectedCount = selectedPhotoPaths.length;
  const isBulkSelectionLocked = isMultiSelectMode && selectedCount > 0;
  const isWorkspaceTransitioning = !!viewPreparationLabel;
  const bulkFavoriteWillEnable = useMemo(
    () => selectedPhotoRefs.length !== selectedCount || selectedPhotoRefs.some((photo) => !photo.is_favorite),
    [selectedCount, selectedPhotoRefs],
  );
  const activeFilterCount = useMemo(() => (
    [
      worldFilters.length > 0,
      !!dateFrom || !!dateTo,
      orientationFilter !== "all",
      favoritesOnly,
      tagFilters.length > 0,
    ].filter(Boolean).length
  ), [worldFilters, dateFrom, dateTo, orientationFilter, favoritesOnly, tagFilters]);

  const handleBulkFavorite = async () => {
    if (selectedPhotoRefs.length === 0) {
      return;
    }

    const nextFavoriteState = bulkFavoriteWillEnable;
    try {
      await invoke("bulk_set_photo_favorite_cmd", {
        photos: selectedPhotoRefs.map((photo) => ({
          photoPath: photo.photo_path,
          sourceSlot: photo.source_slot ?? 1,
        })),
        isFavorite: nextFavoriteState,
      });
      setSelectedPhotoRefs((prev) => prev.map((photo) => ({ ...photo, is_favorite: nextFavoriteState })));
      setPhotos((prev) => prev.map((photo) => (
        selectedPhotoPathSet.has(photo.photo_path)
          ? { ...photo, is_favorite: nextFavoriteState }
          : photo
      )));
    } catch (err) {
      addToast(`一括お気に入り更新に失敗しました: ${String(err)}`, "error");
    }
  };

  const openBulkTagModal = () => {
    setBulkTagSelections([]);
    setIsBulkTagModalOpen(true);
  };

  const applyBulkTag = async () => {
    const resolvedTags = bulkTagSelections
      .map((tag) => tag.trim())
      .filter((tag, index, tags) => !!tag && tags.indexOf(tag) === index);
    if (resolvedTags.length === 0) {
      addToast("一括タグ付けに使うタグを選択してください。", "error");
      return;
    }
    if (resolvedTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      addToast(`タグは${MAX_TAG_LENGTH}文字以内で入力してください。`, "error");
      return;
    }
    if (selectedPhotoRefs.length === 0) {
      setIsBulkTagModalOpen(false);
      return;
    }

    try {
      const targetPhotos = selectedPhotoRefs.map((photo) => ({
        photoPath: photo.photo_path,
        sourceSlot: photo.source_slot ?? 1,
      }));
      for (const tag of resolvedTags) {
        await invoke("bulk_add_photo_tag_cmd", {
          photos: targetPhotos,
          tag,
        });
      }
      setPhotos((prev) => prev.map((photo) => (
        selectedPhotoPathSet.has(photo.photo_path)
          ? {
            ...photo,
            tags: [...new Set([...photo.tags, ...resolvedTags])].sort((left, right) => left.localeCompare(right, "ja")),
          }
          : photo
      )));
      setBulkTagSelections([]);
      setIsBulkTagModalOpen(false);
      addToast(`${selectedCount}件にタグを追加しました。`);
    } catch (err) {
      addToast(`一括タグ付けに失敗しました: ${String(err)}`, "error");
    }
  };

  const handleBulkCopy = async () => {
    if (selectedPhotoPaths.length === 0) {
      return;
    }

    try {
      const destination = await open({
        directory: true,
        multiple: false,
        title: "コピー先フォルダを選択",
      });

      if (!destination || Array.isArray(destination)) {
        return;
      }

      await invoke("bulk_copy_photos_cmd", {
        photoPaths: selectedPhotoPaths,
        destinationDir: destination,
      });
    } catch (err) {
      addToast(`一括コピーに失敗しました: ${String(err)}`, "error");
    }
  };

  const cellProps = useMemo(
    () => ({
      data: displayPhotoItems,
      onSelect: handlePhotoActivate,
      onToggleSelect: toggleSelectedPhoto,
      isSelected: (item: DisplayPhotoItem) => selectedPhotoPathSet.has(item.photo.photo_path),
      showTags: isMultiSelectMode && selectedCount > 0,
      showSelectionToggle: isMultiSelectMode,
      columnCount: standardColumnCount,
      startIndex: 0,
    }),
    [displayPhotoItems, isMultiSelectMode, selectedPhotoPathSet, selectedCount, standardColumnCount],
  );
  const displayTotalRows = viewMode === "standard"
    ? STANDARD_GRID_VISIBLE_ROW_COUNT
    : Math.max(1, Math.ceil(displayPhotoItems.length / standardColumnCount));
  const isGalleryScreen = activeMainScreen === "gallery";
  useEffect(() => {
    if (!isGalleryScreen || !isPagingActive) {
      return undefined;
    }

    const hasBlockingModal = !!selectedPhotoView
      || isBulkTagModalOpen
      || !!pendingFolderPath
      || !!pendingRestoreCandidate
      || !!pendingResetRequest;

    if (hasBlockingModal) {
      return undefined;
    }

    const handlePageKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target) || scanStatus === "scanning" || isWorkspaceTransitioning) {
        return;
      }

        const key = event.key.toLowerCase();
        if (key === "arrowleft" || key === "arrowup" || key === "a" || key === "w") {
          if (!hasPrevPage) {
            return;
          }
          event.preventDefault();
         void goToPrevPage({ defer: event.repeat });
          return;
        }

        if (key === "arrowright" || key === "arrowdown" || key === "d" || key === "s") {
          if (!hasNextPage) {
            return;
          }
          event.preventDefault();
         void goToNextPage({ defer: event.repeat });
        }
      };

    window.addEventListener("keydown", handlePageKeydown);
    return () => window.removeEventListener("keydown", handlePageKeydown);
  }, [
    goToNextPage,
    goToPrevPage,
    hasNextPage,
    hasPrevPage,
    isBulkTagModalOpen,
    isGalleryScreen,
    isLoading,
    isPagingActive,
    pendingFolderPath,
    pendingResetRequest,
    pendingRestoreCandidate,
    scanStatus,
    selectedPhotoView,
    isWorkspaceTransitioning,
  ]);

  return (
    <div className={`alpheratz-root ${themeMode === "dark" ? "theme-dark" : "theme-light"} ${isBulkSelectionLocked ? "bulk-selection-locked" : ""} ${isWorkspaceTransitioning ? "view-transitioning" : ""}`}>
      <Header
        onRefresh={() => {
          if (scanStatus === "scanning") {
            cancelScan();
            return;
          }
          void startScan();
        }}
        onOpenSettings={() => setActiveMainScreen((prev) => (prev === "settings" ? "gallery" : "settings"))}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilterCount={activeFilterCount}
        controlsDisabled={isBulkSelectionLocked || isWorkspaceTransitioning}
        filterDisabled={!isGalleryScreen}
        showFilterButton={isGalleryScreen}
      />

      <main className={`main-content ${isFilterOpen ? "filter-open" : ""}`}>
        {scanStatus === "scanning" && (
          <ScanningOverlay
            progress={scanProgress}
            title="分析中..."
            description="一覧表示に必要なキャッシュと分析情報を取り込んでいます"
            onCancel={cancelScan}
            canCancel={true}
          />
        )}
        {isGalleryScreen && isFilterOpen && <button className="filter-backdrop" onClick={() => setIsFilterOpen(false)} aria-label="絞り込みを閉じる" />}
        {isGalleryScreen && (
          <FilterSidebar
            isOpen={isFilterOpen}
            activeFilterCount={activeFilterCount}
            filteredCount={totalCount}
            worldFilters={worldFilters}
            setWorldFilters={setWorldFilters}
            worldNameList={worldNameList}
            worldCounts={worldCounts}
            datePreset={datePreset}
            onDatePresetSelect={handleDatePresetSelect}
            dateFrom={dateFrom}
            setDateFrom={handleDateFromChange}
            dateTo={dateTo}
            setDateTo={handleDateToChange}
            orientationFilter={orientationFilter}
            setOrientationFilter={setOrientationFilter}
            orientationFilterDisabled={false}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            tagFilters={tagFilters}
            setTagFilters={setTagFilters}
            tagOptions={tagOptions}
            onReset={resetFilters}
          />
        )}
        <div className="grid-area">
          <aside className={`left-rail ${(isBulkSelectionLocked || isWorkspaceTransitioning) ? "disabled" : ""}`} aria-label="表示操作">
            <div className="left-rail-controls">
              <div className="left-rail-section">
                <div className="left-rail-nav-group" role="group" aria-label="画面">
                  <button
                    className={`left-rail-button ${activeMainScreen === "gallery" ? "active" : ""}`}
                    onClick={() => setActiveMainScreen("gallery")}
                    disabled={isWorkspaceTransitioning}
                    aria-label="ギャラリー"
                    title="ギャラリー"
                    type="button"
                  >
                    <span className="left-rail-icon"><Icons.Photo /></span>
                    <span className="left-rail-label">ギャラリー</span>
                  </button>
                </div>
              </div>
              <div className="left-rail-section">
                <div className="left-rail-section-title">編集</div>
                <div className="left-rail-nav-group" role="group" aria-label="編集">
                  <button
                    className={`left-rail-button ${activeMainScreen === "tagMaster" ? "active" : ""}`}
                    onClick={() => setActiveMainScreen((prev) => (prev === "tagMaster" ? "gallery" : "tagMaster"))}
                    disabled={isWorkspaceTransitioning}
                    aria-label="タグマスタ編集"
                    title="タグマスタ編集"
                    type="button"
                  >
                    <span className="left-rail-icon"><Icons.Tag /></span>
                    <span className="left-rail-label">タグマスタ編集</span>
                  </button>
                  <button
                    className={`left-rail-button ${activeMainScreen === "template" ? "active" : ""}`}
                    onClick={() => setActiveMainScreen((prev) => (prev === "template" ? "gallery" : "template"))}
                    disabled={isWorkspaceTransitioning}
                    aria-label="テンプレート編集"
                    title="テンプレート編集"
                    type="button"
                  >
                    <span className="left-rail-icon"><Icons.Template /></span>
                    <span className="left-rail-label">テンプレート編集</span>
                  </button>
                </div>
              </div>
              {isGalleryScreen && (
                <>
                  <div className="left-rail-section">
                    <div className="left-rail-section-title">選択</div>
                    <div className="left-rail-nav-group" role="group" aria-label="選択">
                      <button
                        className={`left-rail-button ${isMultiSelectMode ? "active" : ""}`}
                        onClick={handleToggleMultiSelectMode}
                        disabled={isWorkspaceTransitioning}
                        type="button"
                      >
                        <span className="left-rail-icon"><Icons.CheckSquare /></span>
                        <span className="left-rail-label">複数選択</span>
                      </button>
                    </div>
                  </div>
                  <div className="left-rail-section">
                    <div className="left-rail-section-title">グループ化</div>
                    <div className="left-rail-nav-group" role="group" aria-label="グループ化">
                      <button
                        className={`left-rail-button ${groupingMode === "none" ? "active" : ""}`}
                        onClick={() => prepareGroupingModeChange("none")}
                        disabled={isWorkspaceTransitioning}
                        type="button"
                      >
                        <span className="left-rail-icon"><Icons.Stack /></span>
                        <span className="left-rail-label">なし</span>
                      </button>
                        <button
                          className={`left-rail-button ${groupingMode === "world" ? "active" : ""}`}
                          onClick={() => prepareGroupingModeChange("world")}
                          disabled={isWorkspaceTransitioning || isGroupingUnavailableInMasonry}
                          title={isGroupingUnavailableInMasonry ? "ピンボード表示ではこの機能は使えません" : "ワールド名ごとにまとめる"}
                          type="button"
                        >
                        <span className="left-rail-icon"><Icons.Globe /></span>
                        <span className="left-rail-label">ワールド名でまとめる</span>
                      </button>
                    </div>
                  </div>
                  <div className="left-rail-section">
                    <div className="left-rail-section-title">表示フォルダ</div>
                    <div className="left-rail-nav-group" role="group" aria-label="表示フォルダ">
                      <button
                        className={`left-rail-button ${displayFolderMode === "primary" ? "active" : ""}`}
                        onClick={() => prepareDisplayFolderModeChange("primary")}
                        disabled={isWorkspaceTransitioning}
                        type="button"
                      >
                        <span className="left-rail-icon"><Icons.Folder /></span>
                        <span className="left-rail-label">1st</span>
                      </button>
                      <button
                        className={`left-rail-button ${displayFolderMode === "secondary" ? "active" : ""}`}
                        onClick={() => prepareDisplayFolderModeChange("secondary")}
                        disabled={!hasSecondaryFolder || isWorkspaceTransitioning}
                        title={hasSecondaryFolder ? "2nd フォルダのみ表示" : "2nd フォルダが設定されていません"}
                        type="button"
                      >
                        <span className="left-rail-icon"><Icons.Folder /></span>
                        <span className="left-rail-label">2nd</span>
                      </button>
                      <button
                        className={`left-rail-button ${displayFolderMode === "all" ? "active" : ""}`}
                        onClick={() => prepareDisplayFolderModeChange("all")}
                        disabled={isWorkspaceTransitioning}
                        type="button"
                      >
                        <span className="left-rail-icon"><Icons.Stack /></span>
                        <span className="left-rail-label">全フォルダ</span>
                      </button>
                    </div>
                  </div>
                  {isMasonryEnabled && (
                    <div className="left-rail-section left-rail-section-viewmode">
                      <div className="left-rail-section-title">表示形式</div>
                      <div className="left-rail-nav-group" role="group" aria-label="表示形式">
                        <button
                          className={`left-rail-button ${viewMode === "standard" ? "active" : ""}`}
                          onClick={() => void handleViewModeChange("standard")}
                          disabled={isWorkspaceTransitioning}
                          aria-label="グリッド"
                          title="グリッド"
                          type="button"
                        >
                          <span className="left-rail-icon"><Icons.Grid /></span>
                          <span className="left-rail-label">グリッド</span>
                        </button>
                        <button
                          className={`left-rail-button ${viewMode === "gallery" ? "active" : ""}`}
                          onClick={() => void handleViewModeChange("gallery")}
                          disabled={isWorkspaceTransitioning}
                          aria-label="ピンボード"
                          title="ピンボード"
                          type="button"
                        >
                          <span className="left-rail-icon"><Icons.Gallery /></span>
                          <span className="left-rail-label">ピンボード</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>

          <div className="right-panel" ref={rightPanelRef}>
            {isGalleryScreen && viewPreparationLabel && (
              <div className="view-preparing-overlay" aria-live="polite" aria-busy="true">
                <div className="view-preparing-card">
                  <div className="spinner" />
                  <div className="view-preparing-title">{viewPreparationLabel}</div>
                </div>
              </div>
            )}
            {isGalleryScreen && (scanStatus !== "scanning" && !isLoading && totalCount === 0) && (
              <EmptyState
                isFiltering={
                  !!searchQuery
                  || worldFilters.length > 0
                  || !!dateFrom
                  || !!dateTo
                  || favoritesOnly
                  || tagFilters.length > 0
                  || orientationFilter !== "all"
                }
              />
            )}

            {isGalleryScreen && (
              <>
                <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0, paddingBottom: selectedCount > 0 ? 92 : 0 }}>
                  <PhotoGrid
                    photos={displayPhotoItems}
                    viewMode={viewMode}
                    scrollTop={scrollTop}
                    columnCount={viewMode === "standard" ? standardColumnCount : measuredColumnCount}
                    columnWidth={standardColumnWidth}
                    totalRows={displayTotalRows}
                    ROW_HEIGHT={standardRowHeight}
                    gridHeight={gridHeight}
                    panelWidth={panelWidth}
                    handleGridScroll={handleGridScroll}
                    handleGridWheel={handleGridWheel}
                    onReachGridEnd={() => {
                      if (viewMode === "gallery" && hasMorePhotos && !isLoading && !isLoadingMore) {
                        void loadMorePhotos();
                      }
                    }}
                    cellProps={{ ...cellProps, data: displayPhotoItems }}
                    onGridRef={onGridRef}
                    showBottomLoader={viewMode === "gallery" && isLoadingMore}
                  />
                </div>
                {isPagingActive && totalCount > 0 && (
                  <div className="pager-bar pager-bar-bottom">
                    <button
                      className="pager-button"
                      onClick={() => void goToPrevPage()}
                      disabled={!hasPrevPage || scanStatus === "scanning" || isWorkspaceTransitioning}
                      type="button"
                    >
                      前へ
                    </button>
                    <div className="pager-status">
                      {pageIndex + 1} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                    </div>
                    <button
                      className="pager-button pager-button-primary"
                      onClick={() => void goToNextPage()}
                      disabled={!hasNextPage || scanStatus === "scanning" || isWorkspaceTransitioning}
                      type="button"
                    >
                      次へ
                    </button>
                  </div>
                )}
                {isMultiSelectMode && selectedCount > 0 && (
                  <div className="bulk-selection-bar" role="region" aria-label="複数選択アクション">
                    <div className="bulk-selection-count">{selectedCount}件選択中</div>
                    <div className="bulk-selection-actions">
                      <button
                        className={`bulk-selection-button ${bulkFavoriteWillEnable ? "primary" : ""}`}
                        onClick={() => void handleBulkFavorite()}
                        type="button"
                      >
                        {bulkFavoriteWillEnable ? "一括お気に入り" : "一括お気に入り解除"}
                      </button>
                      <button
                        className="bulk-selection-button"
                        onClick={openBulkTagModal}
                        type="button"
                      >
                        一括タグ付け
                      </button>
                      <button
                        className="bulk-selection-button"
                        onClick={() => void handleBulkCopy()}
                        type="button"
                      >
                        一括別フォルダコピー
                      </button>
                    </div>
                    <button
                      className="bulk-selection-dismiss"
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
            {activeMainScreen === "settings" && (
              <div className="workspace-screen">
                <SettingsModal
                  embedded={true}
                  photoFolderPath={photoFolderPath}
                  secondaryPhotoFolderPath={secondaryPhotoFolderPath}
                  handleChooseFolder={handleChooseFolder}
                  handleResetFolder={handleResetFolder}
                  startupEnabled={startupEnabled}
                  onToggleStartup={() => handleStartupPreference(!startupEnabled)}
                  themeMode={themeMode}
                  onToggleTheme={handleThemeToggle}
                  masonryEnabled={isMasonryEnabled}
                  onToggleMasonry={handleMasonryToggle}
                  isUnknownWorldAnalysisRunning={isPdqRunning}
                  unknownWorldAnalysisLabel={isPdqRunning ? `分析中 ${pdqProgress.done}/${pdqProgress.total || 0}` : null}
                  onStartUnknownWorldAnalysis={handleStartUnknownWorldAnalysis}
                />
              </div>
            )}
            {activeMainScreen === "tagMaster" && (
              <div className="workspace-screen">
                <TagMasterModal
                  embedded={true}
                  masterTags={masterTags}
                  onCreateTagMaster={createTagMaster}
                  onDeleteTagMaster={deleteTagMaster}
                />
              </div>
            )}
            {activeMainScreen === "template" && (
              <div className="workspace-screen">
                <TweetTemplatePanel
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
              </div>
            )}
          </div>

        </div>
      </main>

      {isBulkTagModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBulkTagModalOpen(false)}>
          <div className="modal-content quick-tag-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setIsBulkTagModalOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="modal-body" style={{ gridTemplateColumns: "1fr" }}>
              <div className="modal-info">
                <div className="info-header">
                  <h2>一括タグ付け</h2>
                </div>
                <div className="quick-tag-modal-body">
                  <p>{selectedCount}件の写真へ追加するタグを選択してください。</p>
                  <label className="quick-tag-modal-label">追加するタグ</label>
                  <div className="bulk-tag-picker">
                    {hasMasterTags ? (
                      tagOptions.map((tag) => {
                        const isSelected = bulkTagSelections.includes(tag);
                        return (
                          <button
                            key={tag}
                            className={`bulk-tag-option ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setBulkTagSelections((prev) => (
                                prev.includes(tag)
                                  ? prev.filter((item) => item !== tag)
                                  : [...prev, tag]
                              ));
                            }}
                            type="button"
                          >
                            {tag}
                          </button>
                        );
                      })
                    ) : (
                      <div className="tag-dropdown-empty">タグが登録されていません。</div>
                    )}
                  </div>
                  <div className="quick-tag-modal-label">追加タグ</div>
                  <div className="bulk-tag-selection-list">
                    {bulkTagSelections.length > 0 ? (
                      bulkTagSelections.map((tag) => (
                        <button
                          key={tag}
                          className="tag-chip"
                          onClick={() => setBulkTagSelections((prev) => prev.filter((item) => item !== tag))}
                          type="button"
                        >
                          {tag} ×
                        </button>
                      ))
                    ) : (
                      <div className="bulk-tag-selection-empty">タグを選択するとここに表示されます。</div>
                    )}
                  </div>
                  {!hasMasterTags && (
                    <div className="tag-select-empty-note">
                      <button
                        className="tag-master-link-button"
                        onClick={() => {
                          setIsBulkTagModalOpen(false);
                          setActiveMainScreen("tagMaster");
                        }}
                        type="button"
                      >
                        タグマスタ編集を開く
                      </button>
                    </div>
                  )}
                </div>
                <div className="folder-change-actions">
                  <button
                    className="modal-secondary-button"
                    onClick={() => setIsBulkTagModalOpen(false)}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className="world-link-button"
                    onClick={() => void applyBulkTag()}
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            canGoPrev={selectedPhotoIndex > 0 || (isPagingActive && hasPrevPage)}
            canGoNext={(selectedPhotoIndex >= 0 && selectedPhotoIndex < displayPhotoItems.length - 1) || (isPagingActive && hasNextPage)}
            onGoPrev={() => {
              if (selectedPhotoIndex > 0) {
                const previousItem = displayPhotoItems[selectedPhotoIndex - 1];
                setSelectedPhoto(previousItem.photo);
                return;
              }
              if (isPagingActive && hasPrevPage && !isPageTransitioning) {
                pendingModalPageNavigationRef.current = "prev";
                void goToPrevPage();
              }
            }}
            onGoNext={() => {
              if (selectedPhotoIndex >= 0 && selectedPhotoIndex < displayPhotoItems.length - 1) {
                const nextItem = displayPhotoItems[selectedPhotoIndex + 1];
                setSelectedPhoto(nextItem.photo);
                return;
              }
              if (isPagingActive && hasNextPage && !isPageTransitioning) {
                pendingModalPageNavigationRef.current = "next";
                void goToNextPage();
              }
            }}
          groupedPhotos={modalGroupedPhotos}
          groupedPhotoTotalCount={selectedGroupedPhotos?.length ?? 0}
          groupedPhotoLabel={groupedPhotoLabel}
          showGroupedPhotos={showGroupedPhotosInModal}
          onSelectGroupedPhoto={setSelectedPhoto}
          canTweet={hasActiveTweetTemplate}
          tweetTooltipLabel={hasActiveTweetTemplate ? "ツイート投稿画面を開く" : "テンプレートがありません"}
          onToggleFavorite={() => toggleFavorite(selectedPhotoView.photo_path, selectedPhotoView.is_favorite)}
          onTweet={() => void handleTweetPhoto(selectedPhotoView)}
          onAddTag={(tag) => addTag(selectedPhotoView.photo_path, tag)}
          onRemoveTag={(tag) => removeTag(selectedPhotoView.photo_path, tag)}
          onOpenTagMaster={() => {
            closePhotoModal();
            setActiveMainScreen("tagMaster");
          }}
          onApplySimilarWorldMatch={applySimilarWorldMatch}
          addToast={addToast}
        />
      )}
      {pendingFolderPath && (
        <div className="modal-overlay" onClick={() => !isApplyingFolderChange && setPendingFolderPath(null)}>
          <div className="modal-content settings-panel folder-change-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !isApplyingFolderChange && setPendingFolderPath(null)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="modal-body" style={{ gridTemplateColumns: "1fr" }}>
              <div className="modal-info">
                <div className="info-header"><h2>バックアップの確認</h2></div>
                <div className="folder-change-warning">
                  <strong>変更前にバックアップを作成しますか？</strong>
                  <p>現在のフォルダに紐づく写真一覧、タグ、お気に入り、メモ、キャッシュ情報を退避してから切り替えられます。</p>
                  <p>変更先: {pendingFolderPath}</p>
                </div>
                <div className="folder-change-actions">
                  <button
                    className="modal-secondary-button"
                    onClick={() => setPendingFolderPath(null)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className="modal-secondary-button"
                    onClick={() => void handleFolderChangeBackupDecision(false)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    バックアップなしで続行
                  </button>
                  <button
                    className="world-link-button"
                    onClick={() => void handleFolderChangeBackupDecision(true)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    {isApplyingFolderChange ? "切替中..." : "バックアップして続行"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingResetRequest && (
        <div className="modal-overlay" onClick={() => !isApplyingFolderChange && setPendingResetRequest(null)}>
          <div className="modal-content settings-panel folder-change-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !isApplyingFolderChange && setPendingResetRequest(null)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="modal-body" style={{ gridTemplateColumns: "1fr" }}>
              <div className="modal-info">
                <div className="info-header"><h2>リセット前の確認</h2></div>
                <div className="folder-change-warning">
                  <strong>リセット前にバックアップを作成しますか？</strong>
                  <p>対象パス: {pendingResetRequest.path}</p>
                  <p>リセット後は対象スロットの設定とキャッシュ情報を削除します。</p>
                </div>
                <div className="folder-change-actions">
                  <button
                    className="modal-secondary-button"
                    onClick={() => setPendingResetRequest(null)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    キャンセル
                  </button>
                  <button
                    className="modal-secondary-button"
                    onClick={() => void handleResetBackupDecision(false)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    バックアップなしで続行
                  </button>
                  <button
                    className="world-link-button"
                    onClick={() => void handleResetBackupDecision(true)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    {isApplyingFolderChange ? "リセット中..." : "バックアップして続行"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingRestoreCandidate && (
        <div className="modal-overlay" onClick={() => !isApplyingFolderChange && setPendingRestoreCandidate(null)}>
          <div className="modal-content settings-panel folder-change-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !isApplyingFolderChange && setPendingRestoreCandidate(null)}
              aria-label="閉じる"
            >
              ×
            </button>
            <div className="modal-body" style={{ gridTemplateColumns: "1fr" }}>
              <div className="modal-info">
                <div className="info-header"><h2>バックアップデータの確認</h2></div>
                <div className="folder-change-warning backup-restore-warning">
                  <strong>バックアップデータがあります。反映させますか？</strong>
                  <p>対象パス: {pendingRestoreCandidate.photo_folder_path}</p>
                  <p>バックアップ作成日時: {pendingRestoreCandidate.created_at}</p>
                  <p>※ 復元できるデータは、ファイル名が DB と一致しているデータに限ります。</p>
                </div>
                <div className="folder-change-actions">
                  <button
                    className="modal-secondary-button"
                    onClick={() => void handleFinalizeFolderSelection(pendingRestoreCandidate.photo_folder_path, false)}
                    disabled={isApplyingFolderChange}
                    type="button"
                  >
                    使わない
                  </button>
                  <button
                    className="world-link-button"
                    onClick={() => void handleFinalizeFolderSelection(pendingRestoreCandidate.photo_folder_path, true)}
                    disabled={isApplyingFolderChange}
                  >
                    {isApplyingFolderChange ? "反映中..." : "反映する"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <div className="toast-icon">★</div>
            <div className="toast-msg">{toast.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
