import { AppIcon, APP_ICON_CLASS_NAMES, APP_ICON_NAMES } from '../../../shared/components/Icons';
import styles from './Header.module.css';

interface HeaderProps {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleFilters: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  hashProgressLabel?: string | null;
  activeFilterCount?: number;
}

// Top toolbar for search, refresh, filter, and settings actions.
export const Header = ({
  onRefresh,
  onOpenSettings,
  onToggleFilters,
  searchQuery,
  setSearchQuery,
  hashProgressLabel,
  activeFilterCount = 0,
}: HeaderProps) => {
  const filterButtonClassName = [
    styles['filter-button'],
    activeFilterCount > 0 ? styles.active : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={styles.header}>
      <div className={styles['left-tools']}>
        <button
          className={filterButtonClassName}
          onClick={onToggleFilters}
          aria-label="フィルターを開く"
          title="フィルターを開く"
          type="button"
        >
          <span className={styles['filter-icon']}>
            <AppIcon name={APP_ICON_NAMES.menu} />
          </span>
          <span className={styles['filter-label']}>フィルター</span>
          {activeFilterCount > 0 && (
            <span className={styles['filter-count']}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      <div className={styles.search}>
        <div className={styles['search-bar']}>
          <div className={styles['input-group']}>
            <AppIcon name={APP_ICON_NAMES.search} />
            <input
              type="text"
              placeholder="ワールド名でフィルター..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles['right-tools']}>
        <button
          className={styles['icon-button']}
          onClick={onRefresh}
          aria-label="再読み込み"
          title="再読み込み"
          type="button"
        >
          <AppIcon name={APP_ICON_NAMES.refresh} />
        </button>
        {hashProgressLabel && (
          <div className={styles['progress-chip']} role="status" aria-live="polite">
            {hashProgressLabel}
          </div>
        )}
        <button
          className={styles['icon-button']}
          onClick={onOpenSettings}
          aria-label="設定"
          title="設定"
          type="button"
        >
          <AppIcon name={APP_ICON_NAMES.settings} className={APP_ICON_CLASS_NAMES.medium} />
        </button>
      </div>
    </header>
  );
};
