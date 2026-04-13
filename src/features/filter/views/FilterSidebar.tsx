import { useEffect, useRef } from 'react';
import type { DatePreset, OrientationFilter } from '../models/types';
import { useFilterSidebarViewModel } from '../viewmodels/useFilterSidebarViewModel';
import styles from './FilterSidebar.module.css';

interface FilterSidebarProps {
  isOpen: boolean;
  activeFilterCount: number;
  filteredCount: number;
  worldFilters: string[];
  setWorldFilters: (vals: string[]) => void;
  worldNameList: string[];
  worldCounts: Record<string, number>;
  datePreset: DatePreset;
  onDatePresetSelect: (preset: Exclude<DatePreset, 'none' | 'custom'>) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  orientationFilter: OrientationFilter;
  setOrientationFilter: (val: OrientationFilter) => void;
  orientationFilterDisabled?: boolean;
  favoritesOnly: boolean;
  setFavoritesOnly: (val: boolean) => void;
  tagFilters: string[];
  setTagFilters: (vals: string[]) => void;
  tagOptions: string[];
  onReset: () => void;
}

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const isSameDay = (left: Date | null, right: Date | null) =>
  !!left &&
  !!right &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isWithinRange = (date: Date, start: Date | null, end: Date | null) => {
  if (!start || !end) {
    return false;
  }
  return date >= start && date <= end;
};

const toggleSelection = (values: string[], target: string) =>
  values.includes(target) ? values.filter((value) => value !== target) : [...values, target];

/** Sidebar UI for composing world, date, orientation, favorite, and tag filters. */
export const FilterSidebar = ({
  isOpen,
  activeFilterCount,
  filteredCount,
  worldFilters,
  setWorldFilters,
  worldNameList,
  worldCounts,
  datePreset,
  onDatePresetSelect,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  orientationFilter,
  setOrientationFilter,
  orientationFilterDisabled = false,
  favoritesOnly,
  setFavoritesOnly,
  tagFilters,
  setTagFilters,
  tagOptions,
  onReset,
}: FilterSidebarProps) => {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const worldDropdownRef = useRef<HTMLDivElement | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  const {
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
  } = useFilterSidebarViewModel({
    isOpen,
    dateFrom,
    dateTo,
    datePreset,
    worldNameList,
    worldCounts,
    worldFilters,
    tagOptions,
    tagFilters,
  });

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (worldDropdownRef.current && !worldDropdownRef.current.contains(target)) {
        setIsWorldDropdownOpen(false);
        setWorldSearchQuery('');
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(target)) {
        setIsTagDropdownOpen(false);
        setTagSearchQuery('');
      }
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
        setDraftFrom(dateFrom);
        setDraftTo(dateTo);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [
    dateFrom,
    dateTo,
    setDraftFrom,
    setDraftTo,
    setIsDatePickerOpen,
    setIsTagDropdownOpen,
    setIsWorldDropdownOpen,
    setTagSearchQuery,
    setWorldSearchQuery,
  ]);

  const activeStart = parseDate(draftFrom);
  const activeEnd = parseDate(draftTo);

  const applyPresetToDraft = (preset: Exclude<DatePreset, 'none' | 'custom'>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let from: Date;
    let to: Date;

    if (preset === 'today') {
      from = today;
      to = today;
    } else if (preset === 'last7days') {
      from = new Date(today);
      from.setDate(today.getDate() - 6);
      to = today;
    } else if (preset === 'thisMonth') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === 'halfYear') {
      from = new Date(today);
      from.setMonth(today.getMonth() - 6);
      to = today;
    } else if (preset === 'oneYear') {
      from = new Date(today);
      from.setFullYear(today.getFullYear() - 1);
      to = today;
    } else {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    setDraftPreset(preset);
    setDraftFrom(formatDate(from));
    setDraftTo(formatDate(to));
    setVisibleMonth(new Date(from.getFullYear(), from.getMonth(), 1));
  };

  const handleDateClick = (clickedDate: Date) => {
    const normalized = normalizeDate(clickedDate);
    const clicked = formatDate(normalized);
    setDraftPreset('custom');

    if (activeDateField === 'from') {
      setDraftFrom(clicked);
      if (draftTo && clicked > draftTo) {
        setDraftTo('');
      }
      setActiveDateField('to');
      return;
    }

    if (draftFrom && clicked < draftFrom) {
      setDraftFrom(clicked);
      setDraftTo(draftFrom);
    } else {
      setDraftTo(clicked);
    }
  };

  const handleDateClear = () => {
    setDraftPreset('none');
    setDraftFrom('');
    setDraftTo('');
  };

  const handleDateApply = () => {
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    if (draftPreset !== 'custom' && draftPreset !== 'none') {
      onDatePresetSelect(draftPreset);
    }
    if (draftPreset === 'none') {
      setDateFrom('');
      setDateTo('');
    }
    setIsDatePickerOpen(false);
  };

  return (
    <aside
      ref={sidebarRef}
      className={[styles.root, isOpen ? styles.open : ''].filter(Boolean).join(' ')}
    >
      <header className={styles.header}>
        <div className={styles.title}>
          <h3>条件検索</h3>
          {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
        </div>
        <button className={styles.reset} onClick={onReset}>
          リセット
        </button>
      </header>

      <section className={styles.section} aria-labelledby="filter-world-heading">
        <h4 id="filter-world-heading" className={styles.label}>
          ワールド
        </h4>
        <div ref={worldDropdownRef} className={styles.wrap}>
          <button
            type="button"
            className={[
              styles.trigger,
              isWorldDropdownOpen ? styles.open : '',
              worldFilters.length > 0 ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setIsWorldDropdownOpen((prev) => !prev);
            }}
          >
            <span className={styles.icon}>🌐</span>
            <span className={styles['label-wrap']}>
              <span className={styles.sublabel}>ワールド</span>
              <span className={styles.value}>{selectedWorldLabel}</span>
            </span>
            <span>▼</span>
          </button>

          {isWorldDropdownOpen && (
            <section className={styles.panel} aria-label="ワールド候補">
              <div className={styles['search-wrap']}>
                <span>⌕</span>
                <input
                  className={styles.search}
                  value={worldSearchQuery}
                  placeholder="ワールド名で絞り込む..."
                  onChange={(event) => {
                    setWorldSearchQuery(event.target.value);
                  }}
                />
              </div>
              <ul className={[styles.list, styles['world-list']].join(' ')}>
                <li>
                  <label className={styles['check-item']}>
                    <input
                      type="checkbox"
                      checked={worldFilters.length === 0}
                      onChange={() => {
                        setWorldFilters([]);
                      }}
                    />
                    <span className={styles.dot} />
                    <span className={styles['item-name']}>すべてのワールド</span>
                    <span className={styles['item-count']}>
                      {Object.values(worldCounts).reduce((sum, count) => sum + count, 0)}枚
                    </span>
                  </label>
                </li>

                {visitedWorldOptions.length > 0 && (
                  <>
                    <div className={styles.separator} />
                    <li className={styles['group-label']}>訪問済みワールド</li>
                    {visitedWorldOptions.map((option) => (
                      <li key={option.value}>
                        <label className={styles['check-item']}>
                          <input
                            type="checkbox"
                            checked={worldFilters.includes(option.value)}
                            onChange={() => {
                              setWorldFilters(toggleSelection(worldFilters, option.value));
                            }}
                          />
                          <span className={styles.dot} />
                          <span className={styles['item-name']}>{option.label}</span>
                          <span className={styles['item-count']}>{option.count}枚</span>
                        </label>
                      </li>
                    ))}
                  </>
                )}

                {otherWorldOptions.length > 0 && (
                  <>
                    <div className={styles.separator} />
                    <li className={styles['group-label']}>その他</li>
                    {otherWorldOptions.map((option) => (
                      <li key={option.value}>
                        <label className={styles['check-item']}>
                          <input
                            type="checkbox"
                            checked={worldFilters.includes(option.value)}
                            onChange={() => {
                              setWorldFilters(toggleSelection(worldFilters, option.value));
                            }}
                          />
                          <span className={styles.dot} />
                          <span className={styles['item-name']}>{option.label}</span>
                          <span className={styles['item-count']}>{option.count}枚</span>
                        </label>
                      </li>
                    ))}
                  </>
                )}
              </ul>
              <footer className={styles.footer}>
                <strong>{allWorldOptions.length}</strong> ワールド
              </footer>
            </section>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="filter-date-heading">
        <h4 id="filter-date-heading" className={styles.label}>
          撮影日
        </h4>
        <div ref={datePickerRef} className={styles.wrap}>
          <button
            type="button"
            className={[
              styles['date-trigger'],
              isDatePickerOpen ? styles.open : '',
              dateFrom || dateTo ? styles['has-value'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setDraftFrom(dateFrom);
              setDraftTo(dateTo);
              setDraftPreset(datePreset);
              setIsDatePickerOpen((prev) => !prev);
            }}
          >
            <span className={styles.icon}>📅</span>
            <span className={styles['date-body']}>
              <span className={styles['date-label']}>撮影日</span>
              <span
                className={[styles['date-value'], !(dateFrom || dateTo) ? styles.placeholder : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {rangeLabel}
              </span>
            </span>
            {(dateFrom || dateTo) && (
              <button
                className={styles.reset}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDateClear();
                }}
                type="button"
                aria-label="撮影日条件をクリア"
              >
                ×
              </button>
            )}
          </button>

          {isDatePickerOpen && (
            <section className={styles.calendar} aria-label="撮影日カレンダー">
              <header className={styles['calendar-top']}>
                <p>
                  <span>📅</span>
                  <span>{rangeLabel}</span>
                </p>
                <p>From / To を切り替えて選択します</p>
              </header>

              <div className={styles['date-field-row']}>
                <button
                  type="button"
                  className={[styles['range-chip'], activeDateField === 'from' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setActiveDateField('from');
                  }}
                >
                  <span>From</span>
                  <span>{draftFrom || '---'}</span>
                </button>
                <button
                  type="button"
                  className={[styles['range-chip'], activeDateField === 'to' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setActiveDateField('to');
                  }}
                >
                  <span>To</span>
                  <span>{draftTo || '---'}</span>
                </button>
              </div>

              <div className={styles['preset-grid']}>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'today' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('today');
                  }}
                >
                  今日
                </button>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'last7days' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('last7days');
                  }}
                >
                  直近7日
                </button>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'thisMonth' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('thisMonth');
                  }}
                >
                  今月
                </button>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'lastMonth' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('lastMonth');
                  }}
                >
                  先月
                </button>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'halfYear' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('halfYear');
                  }}
                >
                  半年
                </button>
                <button
                  type="button"
                  className={[styles.preset, draftPreset === 'oneYear' ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    applyPresetToDraft('oneYear');
                  }}
                >
                  一年
                </button>
              </div>

              <section aria-label="月カレンダー">
                {months.slice(0, 1).map(({ monthDate, cells }) => (
                  <article
                    key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                    className={styles.month}
                  >
                    <header className={styles['month-head']}>
                      <button
                        type="button"
                        className={styles['month-nav-button']}
                        onClick={() => {
                          setVisibleMonth((prev) => addMonths(prev, -1));
                        }}
                      >
                        ‹
                      </button>
                      <h5>
                        {monthDate.getFullYear()}年 {monthDate.getMonth() + 1}月
                      </h5>
                      <button
                        type="button"
                        className={styles['month-nav-button']}
                        onClick={() => {
                          setVisibleMonth((prev) => addMonths(prev, 1));
                        }}
                      >
                        ›
                      </button>
                    </header>

                    <ul className={styles.weekdays}>
                      {WEEK_LABELS.map((label) => (
                        <li key={label} className={styles.weekday}>
                          {label}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.grid}>
                      {cells.map((cell) => {
                        const cellDate = normalizeDate(cell.date);
                        const isStart = isSameDay(cellDate, activeStart);
                        const isEnd = isSameDay(cellDate, activeEnd);
                        const isInRange = isWithinRange(cellDate, activeStart, activeEnd);
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            className={[
                              styles.day,
                              isInRange ? styles['in-range'] : '',
                              isStart ? styles['range-start'] : '',
                              isEnd ? styles['range-end'] : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              handleDateClick(cell.date);
                            }}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </section>

              <footer className={styles['calendar-footer']}>
                <button type="button" className={styles['clear-button']} onClick={handleDateClear}>
                  クリア
                </button>
                <button type="button" className={styles['apply-button']} onClick={handleDateApply}>
                  確認
                </button>
              </footer>
            </section>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="filter-orientation-heading">
        <h4 id="filter-orientation-heading" className={styles.label}>
          向き
        </h4>
        <div className={styles['toggle-group']}>
          <button
            type="button"
            disabled={orientationFilterDisabled}
            className={[
              styles['orientation-button'],
              orientationFilter === 'all' ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setOrientationFilter('all');
            }}
          >
            <span className="tg-icon">⊞</span>すべて
          </button>
          <button
            type="button"
            disabled={orientationFilterDisabled}
            className={[
              styles['orientation-button'],
              orientationFilter === 'landscape' ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setOrientationFilter('landscape');
            }}
          >
            <span className="tg-icon">⊟</span>横長
          </button>
          <button
            type="button"
            disabled={orientationFilterDisabled}
            className={[
              styles['orientation-button'],
              orientationFilter === 'portrait' ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setOrientationFilter('portrait');
            }}
          >
            <span className="tg-icon">▯</span>縦長
          </button>
        </div>
        {orientationFilterDisabled && (
          <div className={styles.result}>縦横分析が終わるまで選択できません</div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="filter-tag-heading">
        <h4 id="filter-tag-heading" className={styles.label}>
          タグ
        </h4>
        <div ref={tagDropdownRef} className={styles.wrap}>
          <button
            type="button"
            className={[
              styles.trigger,
              isTagDropdownOpen ? styles.open : '',
              tagFilters.length > 0 ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setIsTagDropdownOpen((prev) => !prev);
            }}
          >
            <span className={styles.icon}>#</span>
            <span className={styles['label-wrap']}>
              <span className={styles.sublabel}>タグ</span>
              <span className={styles.value}>{selectedTagLabel}</span>
            </span>
            <span>▼</span>
          </button>

          {isTagDropdownOpen && (
            <section className={styles.panel} aria-label="タグ候補">
              <div className={styles['search-wrap']}>
                <span>⌕</span>
                <input
                  className={styles.search}
                  value={tagSearchQuery}
                  placeholder="タグ名で絞り込む..."
                  onChange={(event) => {
                    setTagSearchQuery(event.target.value);
                  }}
                />
              </div>
              <ul className={[styles.list, styles['tag-grid']].join(' ')}>
                <li>
                  <label className={styles['check-item']}>
                    <input
                      type="checkbox"
                      checked={tagFilters.length === 0}
                      onChange={() => {
                        setTagFilters([]);
                      }}
                    />
                    <span className={styles.dot} />
                    <span className={styles['item-name']}>すべてのタグ</span>
                  </label>
                </li>
                {filteredTagOptions.map((tag) => (
                  <li key={tag}>
                    <label className={styles['check-item']}>
                      <input
                        type="checkbox"
                        checked={tagFilters.includes(tag)}
                        onChange={() => {
                          setTagFilters(toggleSelection(tagFilters, tag));
                        }}
                      />
                      <span className={styles.dot} />
                      <span className={styles['item-name']}>{tag}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <footer className={styles.footer}>
                <strong>{tagOptions.length}</strong> タグ
              </footer>
            </section>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="filter-favorite-heading">
        <h4 id="filter-favorite-heading" className={styles.label}>
          絞り込み
        </h4>
        <label
          className={[styles['favorite-toggle'], favoritesOnly ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
        >
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => {
              setFavoritesOnly(e.target.checked);
            }}
          />
          <span className={styles['favorite-star']}>★</span>
          <span className={styles['favorite-text']}>お気に入りのみ</span>
          <span>✓</span>
        </label>
      </section>

      <footer className={styles.result}>
        <strong>{filteredCount}枚</strong> 該当
      </footer>
    </aside>
  );
};
