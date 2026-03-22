import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Photo, PhotoPage } from "../types";
import { ToastType } from "./useToasts";

const PAGE_SIZE = 24;
const MIN_AUTO_PAGE_LOAD_MS = 300;
const MIN_MANUAL_PAGE_LOAD_MS = 120;

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
    sourceSlot: number | null;
};

export const usePhotos = (
    filters: PhotoQueryFilters,
    addToast?: (msg: string, type?: ToastType) => void,
) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [pageIndex, setPageIndex] = useState(0);

    const fetchPage = useCallback(async (page: number, minDelayMs: number) => {
        const [results] = await Promise.all([
            invoke<PhotoPage>("get_photos", {
                startDate: filters.dateFrom || null,
                endDate: filters.dateTo || null,
                worldQuery: filters.searchQuery.trim() || null,
                worldExacts: filters.worldFilters.length > 0 ? filters.worldFilters : null,
                orientation: filters.orientationFilter === "all" ? null : filters.orientationFilter,
                favoritesOnly: filters.favoritesOnly || null,
                tagFilters: filters.tagFilters.length > 0 ? filters.tagFilters : null,
                includePhash: !!filters.includePhash,
                sourceSlot: filters.sourceSlot,
                limit: filters.pagingEnabled ? PAGE_SIZE : null,
                offset: filters.pagingEnabled ? page * PAGE_SIZE : null,
            }),
            new Promise((resolve) => window.setTimeout(resolve, filters.pagingEnabled ? minDelayMs : 0)),
        ]);
        return results;
    }, [filters]);

    const loadPhotos = useCallback(async (page = 0, minDelayMs = MIN_AUTO_PAGE_LOAD_MS) => {
        setIsLoading(true);
        if (filters.pagingEnabled) {
            setPhotos([]);
        }
        try {
            const results = await fetchPage(page, minDelayMs);
            setPhotos(results.items);
            setTotalCount(results.total);
            setPageIndex(page);
        } catch (err) {
            addToast?.(`写真一覧の読み込みに失敗しました: ${String(err)}`, "error");
        } finally {
            setIsLoading(false);
        }
    }, [addToast, fetchPage]);

    const goToNextPage = useCallback(async () => {
        if (isLoading || !filters.pagingEnabled) {
            return;
        }
        const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
        if (pageIndex >= maxPage) {
            return;
        }
        await loadPhotos(pageIndex + 1, MIN_MANUAL_PAGE_LOAD_MS);
    }, [filters.pagingEnabled, isLoading, loadPhotos, pageIndex, totalCount]);

    const goToPrevPage = useCallback(async () => {
        if (isLoading || !filters.pagingEnabled || pageIndex <= 0) {
            return;
        }
        await loadPhotos(pageIndex - 1, MIN_MANUAL_PAGE_LOAD_MS);
    }, [filters.pagingEnabled, isLoading, loadPhotos, pageIndex]);

    useEffect(() => {
        setIsLoading(true);
        loadPhotos(0);

        const unlistens = [
            listen("scan:completed", () => {
                loadPhotos();
            }),
            listen("scan:enrich_completed", () => {
                loadPhotos();
            }),
        ];

        return () => {
            unlistens.forEach((promise) => {
                promise.then((u: UnlistenFn) => u());
            });
        };
    }, [loadPhotos]);

    return {
        photos,
        setPhotos,
        loadPhotos,
        goToNextPage,
        goToPrevPage,
        isLoading,
        totalCount,
        pageIndex,
        pageSize: PAGE_SIZE,
        hasPrevPage: filters.pagingEnabled && pageIndex > 0,
        hasNextPage: filters.pagingEnabled && (pageIndex + 1) * PAGE_SIZE < totalCount,
    };
};
