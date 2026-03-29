import { useState, useCallback, useEffect, useRef, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { DisplayPhotoItem, GroupedPhotoPage, Photo, PhotoPage } from "../types";
import { ToastType } from "./useToasts";
import { DETACH_AUXILIARY_RUNTIME_DATA, DETACH_RUNTIME_DATA } from "../config/runtimeFlags";

const PAGE_SIZE = 24;
const GALLERY_CHUNK_SIZE = 30;
const GALLERY_MAX_ITEMS = 120;
const IMMEDIATE_PAGE_JUMP_THRESHOLD = 3;
const PAGE_SWITCH_IDLE_MS = 500;

type PhotoQueryFilters = {
    searchQuery: string;
    worldFilters: string[];
    dateFrom: string;
    dateTo: string;
    orientationFilter: string;
    favoritesOnly: boolean;
    tagFilters: string[];
    includePhash?: boolean;
    pagingEnabled: boolean;
    viewMode: "standard" | "gallery";
    sourceSlot: number | null;
    groupingMode: "none" | "world";
};

type DisplayPageResult = {
    photos: Photo[];
    items: DisplayPhotoItem[];
    total: number;
};

type PageNavigationOptions = {
    defer?: boolean;
};

type FetchOptions = {
    limit?: number | null;
    offset?: number | null;
};

export const usePhotos = (
    filters: PhotoQueryFilters,
    addToast?: (msg: string, type?: ToastType) => void,
) => {
    const [photos, setPhotosState] = useState<Photo[]>([]);
    const [visiblePhotos, setVisiblePhotos] = useState<Photo[]>([]);
    const [displayItems, setDisplayItems] = useState<DisplayPhotoItem[]>([]);
    const [visibleDisplayItems, setVisibleDisplayItems] = useState<DisplayPhotoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageTransitioning, setIsPageTransitioning] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [pageIndex, setPageIndex] = useState(0);
    const [pendingPageIndex, setPendingPageIndex] = useState<number | null>(null);
    const transitionTokenRef = useRef(0);
    const pendingPageRef = useRef<number | null>(null);
    const pageTransitionTimeoutRef = useRef<number | null>(null);
    const lastCommittedPageRef = useRef(0);
    const photosRef = useRef<Photo[]>([]);
    const displayItemsRef = useRef<DisplayPhotoItem[]>([]);
    const galleryWindowOffsetRef = useRef(0);
    const isLoadingMoreRef = useRef(false);

    const clearTransitionTimeout = useCallback(() => {
        if (pageTransitionTimeoutRef.current !== null) {
            window.clearTimeout(pageTransitionTimeoutRef.current);
            pageTransitionTimeoutRef.current = null;
        }
    }, []);
    const setPhotos = useCallback((updater: SetStateAction<Photo[]>) => {
        setPhotosState((prevPhotos) => {
            const nextPhotos = typeof updater === "function"
                ? (updater as (prevState: Photo[]) => Photo[])(prevPhotos)
                : updater;
            photosRef.current = nextPhotos;
            const nextPhotoMap = new Map(nextPhotos.map((photo) => [photo.photo_path, photo]));

            const syncItems = (items: DisplayPhotoItem[]) => items.map((item) => {
                const nextPhoto = nextPhotoMap.get(item.photo.photo_path);
                if (!nextPhoto) {
                    return item;
                }
                return {
                    ...item,
                    photo: nextPhoto,
                    groupPhotos: item.groupPhotos?.map((photo) => nextPhotoMap.get(photo.photo_path) ?? photo),
                };
            });
            displayItemsRef.current = syncItems(displayItemsRef.current);

            setDisplayItems((prevItems) => syncItems(prevItems));
            setVisibleDisplayItems((prevItems) => syncItems(prevItems));
            setVisiblePhotos((prevVisiblePhotos) => prevVisiblePhotos.map((photo) => nextPhotoMap.get(photo.photo_path) ?? photo));
            return nextPhotos;
        });
    }, []);

    const fetchPage = useCallback(async (page: number, options?: FetchOptions) => {
        const limit = options?.limit ?? (filters.pagingEnabled ? PAGE_SIZE : null);
        const offset = options?.offset ?? (filters.pagingEnabled ? page * PAGE_SIZE : null);
        const commonParams = {
            startDate: filters.dateFrom || null,
            endDate: filters.dateTo || null,
            worldQuery: filters.searchQuery.trim() || null,
            worldExacts: filters.worldFilters.length > 0 ? filters.worldFilters : null,
            orientation: filters.orientationFilter === "all" ? null : filters.orientationFilter,
            favoritesOnly: filters.favoritesOnly || null,
            tagFilters: filters.tagFilters.length > 0 ? filters.tagFilters : null,
            sourceSlot: filters.sourceSlot,
            limit,
            offset,
        };

        const results = await (
            DETACH_AUXILIARY_RUNTIME_DATA
                ? filters.viewMode === "gallery"
                    ? invoke<PhotoPage>("get_gallery_photos_minimal_cmd", commonParams)
                    : invoke<PhotoPage>("get_list_photos_minimal_cmd", commonParams)
                : filters.groupingMode === "world"
                ? invoke<GroupedPhotoPage>("get_world_grouped_photos_cmd", commonParams)
                : invoke<PhotoPage>("get_photos", {
                    ...commonParams,
                    includePhash: !!filters.includePhash,
                })
        );

        if (!DETACH_AUXILIARY_RUNTIME_DATA && filters.groupingMode === "world") {
            const grouped = results as GroupedPhotoPage;
            return {
                photos: grouped.items.map((item) => item.photo),
                items: grouped.items.map((item) => ({
                    photo: item.photo,
                    groupCount: item.group_count,
                    groupKey: item.group_key,
                })),
                total: grouped.total,
            } satisfies DisplayPageResult;
        }

        const pageResult = results as PhotoPage;
        return {
            photos: pageResult.items,
            items: pageResult.items.map((photo) => ({ photo })),
            total: pageResult.total,
        } satisfies DisplayPageResult;
    }, [filters]);

    const loadPhotos = useCallback(async (page = 0) => {
        clearTransitionTimeout();
        const token = transitionTokenRef.current + 1;
        transitionTokenRef.current = token;
        pendingPageRef.current = page;
        setIsLoading(true);

        if (filters.pagingEnabled) {
            setIsPageTransitioning(true);
            setPendingPageIndex(page);
            setPhotosState([]);
            photosRef.current = [];
            setVisiblePhotos([]);
            setDisplayItems([]);
            displayItemsRef.current = [];
            setVisibleDisplayItems([]);
        }

        try {
            const results = await fetchPage(page, filters.pagingEnabled
                ? undefined
                : { limit: GALLERY_CHUNK_SIZE, offset: 0 });
            if (transitionTokenRef.current !== token) {
                return;
            }

            photosRef.current = results.photos;
            displayItemsRef.current = results.items;
            setPhotos(results.photos);
            setDisplayItems(results.items);
            setTotalCount(results.total);
            setPageIndex(page);
            lastCommittedPageRef.current = page;
            galleryWindowOffsetRef.current = 0;
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;

            if (filters.pagingEnabled) {
                setVisiblePhotos(results.photos);
                setVisibleDisplayItems(results.items);
                setIsPageTransitioning(false);
                setPendingPageIndex(null);
                pendingPageRef.current = null;
            } else {
                setVisiblePhotos(results.photos);
                setVisibleDisplayItems(results.items);
                setIsPageTransitioning(false);
                setPendingPageIndex(null);
                pendingPageRef.current = null;
            }
        } catch (err) {
            addToast?.(`写真一覧の読み込みに失敗しました: ${String(err)}`, "error");
            if (transitionTokenRef.current === token) {
                setIsPageTransitioning(false);
                setPendingPageIndex(null);
                pendingPageRef.current = null;
                setIsLoadingMore(false);
                isLoadingMoreRef.current = false;
            }
        } finally {
            if (transitionTokenRef.current === token) {
                setIsLoading(false);
            }
        }
    }, [addToast, clearTransitionTimeout, fetchPage, filters.pagingEnabled]);

    const loadMorePhotos = useCallback(async () => {
        if (filters.pagingEnabled || isLoading || isLoadingMoreRef.current) {
            return;
        }

        const currentOffset = galleryWindowOffsetRef.current;
        const loadedCount = photosRef.current.length;
        const knownTotal = totalCount;
        if (loadedCount === 0 || currentOffset + loadedCount >= knownTotal) {
            return;
        }

        const token = transitionTokenRef.current;
        const nextOffset = currentOffset + loadedCount;
        setIsLoadingMore(true);
        isLoadingMoreRef.current = true;

        try {
            const results = await fetchPage(0, {
                limit: GALLERY_CHUNK_SIZE,
                offset: nextOffset,
            });
            if (transitionTokenRef.current !== token) {
                return;
            }

            const mergedPhotos = [...photosRef.current, ...results.photos];
            const mergedItems = [...displayItemsRef.current, ...results.items];
            let nextPhotos = mergedPhotos;
            let nextItems = mergedItems;

            if (mergedPhotos.length > GALLERY_MAX_ITEMS) {
                nextPhotos = mergedPhotos.slice(GALLERY_CHUNK_SIZE);
                nextItems = mergedItems.slice(GALLERY_CHUNK_SIZE);
                galleryWindowOffsetRef.current += GALLERY_CHUNK_SIZE;
            }

            photosRef.current = nextPhotos;
            displayItemsRef.current = nextItems;
            setPhotosState(nextPhotos);
            setVisiblePhotos(nextPhotos);
            setDisplayItems(nextItems);
            setVisibleDisplayItems(nextItems);
            setTotalCount(results.total);
        } catch (err) {
            addToast?.(`追加読み込みに失敗しました: ${String(err)}`, "error");
        } finally {
            if (transitionTokenRef.current === token) {
                setIsLoadingMore(false);
                isLoadingMoreRef.current = false;
            }
        }
    }, [addToast, fetchPage, filters.pagingEnabled, isLoading, totalCount]);

    const queuePageLoad = useCallback((page: number) => {
        clearTransitionTimeout();
        pendingPageRef.current = page;
        setPendingPageIndex(page);

        pageTransitionTimeoutRef.current = window.setTimeout(() => {
            if (pendingPageRef.current !== page) {
                return;
            }
            void loadPhotos(page);
        }, PAGE_SWITCH_IDLE_MS);
    }, [clearTransitionTimeout, loadPhotos]);

    const goToNextPage = useCallback(async (options?: PageNavigationOptions) => {
        if (!filters.pagingEnabled) {
            return;
        }
        const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
        const basePage = pendingPageRef.current ?? pageIndex;
        if (basePage >= maxPage) {
            return;
        }
        const nextPage = basePage + 1;
        const committedPage = lastCommittedPageRef.current;
        const shouldLoadImmediately = !options?.defer
            && !isLoading
            && !isPageTransitioning
            && pendingPageRef.current === null
            && Math.abs(nextPage - committedPage) <= IMMEDIATE_PAGE_JUMP_THRESHOLD;

        if (shouldLoadImmediately) {
            void loadPhotos(nextPage);
            return;
        }
        queuePageLoad(nextPage);
    }, [filters.pagingEnabled, isLoading, isPageTransitioning, loadPhotos, pageIndex, queuePageLoad, totalCount]);

    const goToPrevPage = useCallback(async (options?: PageNavigationOptions) => {
        if (!filters.pagingEnabled) {
            return;
        }
        const basePage = pendingPageRef.current ?? pageIndex;
        if (basePage <= 0) {
            return;
        }
        const nextPage = basePage - 1;
        const committedPage = lastCommittedPageRef.current;
        const shouldLoadImmediately = !options?.defer
            && !isLoading
            && !isPageTransitioning
            && pendingPageRef.current === null
            && Math.abs(nextPage - committedPage) <= IMMEDIATE_PAGE_JUMP_THRESHOLD;

        if (shouldLoadImmediately) {
            void loadPhotos(nextPage);
            return;
        }
        queuePageLoad(nextPage);
    }, [filters.pagingEnabled, isLoading, isPageTransitioning, loadPhotos, pageIndex, queuePageLoad]);

    useEffect(() => {
        if (DETACH_RUNTIME_DATA) {
            setPhotosState([]);
            setVisiblePhotos([]);
            setDisplayItems([]);
            setVisibleDisplayItems([]);
            setTotalCount(0);
            setIsLoading(false);
            setIsPageTransitioning(false);
            setIsLoadingMore(false);
            setPageIndex(0);
            setPendingPageIndex(null);
            lastCommittedPageRef.current = 0;
            photosRef.current = [];
            displayItemsRef.current = [];
            galleryWindowOffsetRef.current = 0;
            isLoadingMoreRef.current = false;
            return;
        }

        pendingPageRef.current = null;
        setPendingPageIndex(null);
        lastCommittedPageRef.current = 0;
        galleryWindowOffsetRef.current = 0;
        isLoadingMoreRef.current = false;
        void loadPhotos(0);

        const unlistens = [
            listen("scan:completed", () => {
                void loadPhotos();
            }),
            listen("scan:enrich_completed", () => {
                void loadPhotos();
            }),
        ];

        return () => {
            unlistens.forEach((promise) => {
                promise.then((u: UnlistenFn) => u());
            });
            clearTransitionTimeout();
            transitionTokenRef.current += 1;
        };
    }, [clearTransitionTimeout, loadPhotos]);

    const effectivePageIndex = pendingPageIndex ?? pageIndex;
    const hasPrevPage = filters.pagingEnabled && effectivePageIndex > 0;
    const hasNextPage = filters.pagingEnabled && (effectivePageIndex + 1) * PAGE_SIZE < totalCount;
    const hasMorePhotos = filters.pagingEnabled
        ? hasNextPage
        : galleryWindowOffsetRef.current + photos.length < totalCount;

    return {
        photos,
        visiblePhotos,
        displayItems: filters.pagingEnabled ? visibleDisplayItems : displayItems,
        setPhotos,
        loadPhotos,
        loadMorePhotos,
        goToNextPage,
        goToPrevPage,
        isLoading,
        isLoadingMore,
        isPageTransitioning,
        totalCount,
        pageIndex: effectivePageIndex,
        pageSize: PAGE_SIZE,
        hasMorePhotos,
        hasPrevPage,
        hasNextPage,
    };
};
