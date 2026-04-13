import { useMemo, useState } from 'react';
import type { DatePreset, OrientationFilter } from '../models/types';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getDateRangeFromPreset = (preset: Exclude<DatePreset, 'none' | 'custom'>) => {
  const today = getToday();

  if (preset === 'today') {
    const value = formatDate(today);
    return { from: value, to: value };
  }

  if (preset === 'last7days') {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: formatDate(from), to: formatDate(today) };
  }

  if (preset === 'thisMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: formatDate(from), to: formatDate(to) };
  }

  if (preset === 'halfYear') {
    const from = new Date(today);
    from.setMonth(today.getMonth() - 6);
    return { from: formatDate(from), to: formatDate(today) };
  }

  if (preset === 'oneYear') {
    const from = new Date(today);
    from.setFullYear(today.getFullYear() - 1);
    return { from: formatDate(from), to: formatDate(today) };
  }

  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to = new Date(today.getFullYear(), today.getMonth(), 0);
  return { from: formatDate(from), to: formatDate(to) };
};

/**
 * Manages the global filter state used when querying photos.
 *
 * The hook keeps date preset logic near the raw filter state so the rest of the UI can
 * consume already-normalized strings and counts.
 *
 * @returns Filter state, setter helpers, preset actions, and the active filter count.
 */
export const useFilterViewModel = () => {
  const [worldFilters, setWorldFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFromRaw] = useState('');
  const [dateTo, setDateToRaw] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('none');
  const [orientationFilter, setOrientationFilter] = useState<OrientationFilter>('all');
  const [isFavoritesOnly, setIsFavoritesOnly] = useState(false);
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const handleDatePresetSelect = (preset: Exclude<DatePreset, 'none' | 'custom'>) => {
    const range = getDateRangeFromPreset(preset);
    setDatePreset(preset);
    setDateFromRaw(range.from);
    setDateToRaw(range.to);
  };

  const setDateFrom = (value: string) => {
    setDatePreset('custom');
    setDateFromRaw(value);
  };

  const setDateTo = (value: string) => {
    setDatePreset('custom');
    setDateToRaw(value);
  };

  const resetFilters = () => {
    setWorldFilters([]);
    setDateFromRaw('');
    setDateToRaw('');
    setDatePreset('none');
    setOrientationFilter('all');
    setIsFavoritesOnly(false);
    setTagFilters([]);
  };

  const activeFilterCount = useMemo(
    () =>
      [
        worldFilters.length > 0,
        !!dateFrom || !!dateTo,
        orientationFilter !== 'all',
        isFavoritesOnly,
        tagFilters.length > 0,
      ].filter(Boolean).length,
    [worldFilters, dateFrom, dateTo, orientationFilter, isFavoritesOnly, tagFilters],
  );

  return {
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
  };
};
