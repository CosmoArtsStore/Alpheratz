import type { ThemeMode } from '../../../shared/models/types';
import type { SimilarResolutionTarget } from '../models/types';
import styles from './WorkspacePanels.module.css';

interface SettingsWorkspaceProps {
  photoFolderPath: string;
  secondaryPhotoFolderPath: string;
  onChooseFolder: (slot: 1 | 2) => void;
  startupEnabled: boolean;
  onToggleStartup: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  isArchiveResolutionRunning: boolean;
  isSimilarResolutionRunning: boolean;
  onResolveUnknownWorldsFromArchive: () => void;
  onResolveUnknownWorldsFromSimilarPhotos: (target: SimilarResolutionTarget) => void;
}

// Main-area settings screen restored from the workspace-style UI flow.
export const SettingsWorkspace = ({
  photoFolderPath,
  secondaryPhotoFolderPath,
  onChooseFolder,
  startupEnabled,
  onToggleStartup,
  themeMode,
  onToggleTheme,
  isArchiveResolutionRunning,
  isSimilarResolutionRunning,
  onResolveUnknownWorldsFromArchive,
  onResolveUnknownWorldsFromSimilarPhotos,
}: SettingsWorkspaceProps) => {
  const startupToggleClassName = [styles.toggle, startupEnabled ? styles.active : '']
    .filter(Boolean)
    .join(' ');
  const themeToggleClassName = [styles.toggle, themeMode === 'dark' ? styles.active : '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={styles.panel} aria-labelledby="settings-workspace-title">
      <div className={styles.body}>
        <section className={styles.info}>
          <header className={styles.header}>
            <h2 id="settings-workspace-title">設定</h2>
          </header>

          <section className={styles.section} aria-labelledby="settings-photo-folder-title">
            <h3 id="settings-photo-folder-title">写真フォルダ</h3>
            <div className={styles['folder-list']}>
              <div className={styles['folder-row']}>
                <span className={styles['folder-slot']}>1st</span>
                <input
                  className={styles['path-input']}
                  type="text"
                  value={photoFolderPath}
                  readOnly
                />
                <button
                  className={styles['action-button']}
                  onClick={() => {
                    onChooseFolder(1);
                  }}
                  type="button"
                >
                  変更
                </button>
              </div>
              <div className={styles['folder-row']}>
                <span className={styles['folder-slot']}>2nd</span>
                <input
                  className={styles['path-input']}
                  type="text"
                  value={secondaryPhotoFolderPath}
                  readOnly
                />
                <button
                  className={styles['action-button']}
                  onClick={() => {
                    onChooseFolder(2);
                  }}
                  type="button"
                >
                  変更
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="settings-theme">
            <h3 id="settings-theme">表示テーマ</h3>
            <div className={styles['toggle-row']}>
              <p className={styles['toggle-text']}>
                写真一覧と条件検索を含む表示全体をダークモードへ切り替えます。
              </p>
              <button
                className={themeToggleClassName}
                onClick={onToggleTheme}
                aria-label="ダークテーマを切り替える"
                type="button"
              >
                <span className={styles['toggle-knob']} />
              </button>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="settings-startup">
            <h3 id="settings-startup">起動設定</h3>
            <div className={styles['toggle-row']}>
              <p className={styles['toggle-text']}>
                Windows ログイン時に Alpheratz を自動起動します。
              </p>
              <button
                className={startupToggleClassName}
                onClick={onToggleStartup}
                aria-label="ログイン時の自動起動を切り替える"
                type="button"
              >
                <span className={styles['toggle-knob']} />
              </button>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="settings-world-resolution">
            <h3 id="settings-world-resolution">ワールド不明の手動補完</h3>
            <p className={styles['helper-text']}>
              通常スキャンではワールド不明のまま保持し、必要なときだけここから補完します。
            </p>
            <div className={styles['action-row']}>
              <button
                className={styles['primary-button']}
                onClick={onResolveUnknownWorldsFromArchive}
                disabled={isArchiveResolutionRunning}
                type="button"
              >
                {isArchiveResolutionRunning ? 'archive 補完中...' : 'ログから補完'}
              </button>
              <button
                className={styles['secondary-button']}
                onClick={() => {
                  onResolveUnknownWorldsFromSimilarPhotos('all');
                }}
                disabled={isSimilarResolutionRunning}
                type="button"
              >
                {isSimilarResolutionRunning ? '類似推測中...' : '類似写真から推測'}
              </button>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
};
