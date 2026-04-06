import { useEffect, useMemo, useState } from 'react';
import type { DatePreset } from '../models/types';

interface FilterSidebarViewModelOptions {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  datePreset: DatePreset;
  worldNameList: string[];
  worldCounts: Record<string, number>;
  worldFilters: string[];
  tagOptions: string[];
  tagFilters: string[];
}

interface CalendarCell {
  key: string;
  date: Date;
  day: number;
  inCurrentMonth: boolean;
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  isUnknown?: boolean;
}

const parseDate = (value: string) => {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const buildMonthCells = (monthDate: Date): CalendarCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const getRangeLabel = (from: string, to: string) => {
  if (from && to) {
    return `${from} → ${to}`;
  }
  if (from) {
    return `${from} → ---`;
  }
  return '期間を選択...';
};

const getSelectionLabel = (items: string[], emptyLabel: string, suffix: string) => {
  if (items.length === 0) {
    return emptyLabel;
  }
  if (items.length === 1) {
    return items[0];
  }
  return `${items.length}${suffix}`;
};

export const useFilterSidebarViewModel = ({
  isOpen,
  dateFrom,
  dateTo,
  datePreset,
  worldNameList,
  worldCounts,
  worldFilters,
  tagOptions,
  tagFilters,
}: FilterSidebarViewModelOptions) => {
  const [isWorldDropdownOpen, setIsWorldDropdownOpen] = useState(false);
  const [worldSearchQuery, setWorldSearchQuery] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'from' | 'to'>('from');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDate(dateFrom) ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const [draftPreset, setDraftPreset] = useState<DatePreset>(datePreset);

  useEffect(() => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setDraftPreset(datePreset);
  }, [dateFrom, dateTo, datePreset]);

  useEffect(() => {
    if (!isOpen) {
      setIsWorldDropdownOpen(false);
      setIsTagDropdownOpen(false);
      setIsDatePickerOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }
    const base = parseDate(draftFrom) ?? parseDate(dateFrom) ?? new Date();
    setVisibleMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [isDatePickerOpen, draftFrom, dateFrom]);

  const allWorldOptions = useMemo<FilterOption[]>(
    () =>
      worldNameList.map((name) => ({
        value: name || 'unknown',
        label: name || 'ワールド不明',
        isUnknown: !name,
        count: worldCounts[name || 'unknown'] ?? 0,
      })),
    [worldCounts, worldNameList],
  );

  const filteredWorldOptions = useMemo(() => {
    const query = worldSearchQuery.trim().toLowerCase();
    if (!query) {
      return allWorldOptions;
    }
    return allWorldOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [allWorldOptions, worldSearchQuery]);

  const visitedWorldOptions = useMemo(
    () => filteredWorldOptions.filter((option) => !option.isUnknown),
    [filteredWorldOptions],
  );
  const otherWorldOptions = useMemo(
    () => filteredWorldOptions.filter((option) => option.isUnknown),
    [filteredWorldOptions],
  );

  const filteredTagOptions = useMemo(() => {
    const query = tagSearchQuery.trim().toLowerCase();
    if (!query) {
      return tagOptions;
    }
    return tagOptions.filter((tag) => tag.toLowerCase().includes(query));
  }, [tagOptions, tagSearchQuery]);

  const selectedWorldLabel = useMemo(
    () =>
      getSelectionLabel(
        worldFilters.map(
          (value) => allWorldOptions.find((option) => option.value === value)?.label ?? value,
        ),
        'すべてのワールド',
        '件選択',
      ),
    [allWorldOptions, worldFilters],
  );
  const selectedTagLabel = useMemo(
    () => getSelectionLabel(tagFilters, 'すべてのタグ', '件選択'),
    [tagFilters],
  );

  const rangeLabel = useMemo(() => getRangeLabel(dateFrom, dateTo), [dateFrom, dateTo]);
  const months = useMemo(() => {
    const nextMonth = addMonths(visibleMonth, 1);
    return [visibleMonth, nextMonth].map((monthDate) => ({
      monthDate,
      cells: buildMonthCells(monthDate),
    }));
  }, [visibleMonth]);

  return {
    isWorldDropdownOpen,
    setIsWorldDropdownOpen,
    worldSearchQuery,
    setWorldSearchQuery,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    tagSearchQuery,
    setTagSearchQuery,
    isDatePickerOpen,
    setIsDatePickerOpen,
    activeDateField,
    setActiveDateField,
    visibleMonth,
    setVisibleMonth,
    draftFrom,
    setDraftFrom,
    draftTo,
    setDraftTo,
    draftPreset,
    setDraftPreset,
    allWorldOptions,
    visitedWorldOptions,
    otherWorldOptions,
    filteredTagOptions,
    selectedWorldLabel,
    selectedTagLabel,
    rangeLabel,
    months,
  };
};
