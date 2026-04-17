import { useState, type KeyboardEvent } from 'react';
import type { ThemeMode } from '../../../shared/models/types';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  onClose: () => void;
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
  onResolveUnknownWorldsFromSimilarPhotos: () => void;
  masterTags: string[];
  onCreateTagMaster: (tag: string) => void;
  onDeleteTagMaster: (tag: string) => void;
}

// 設定モーダルでフォルダや表示系設定をまとめて編集する。
export const SettingsModal = ({
  onClose,
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
  masterTags,
  onCreateTagMaster,
  onDeleteTagMaster,
}: SettingsModalProps) => {
  const [tagDraft, setTagDraft] = useState('');

  const submitTagMaster = () => {
    const normalized = tagDraft.trim();
    if (!normalized) {
      return;
    }
    onCreateTagMaster(normalized);
    setTagDraft('');
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitTagMaster();
    }
  };

  const startupToggleClassName = [styles.toggle, startupEnabled ? styles.active : '']
    .filter(Boolean)
    .join(' ');
  const themeToggleClassName = [styles.toggle, themeMode === 'dark' ? styles.active : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        className={styles.overlay}
        onClick={onClose}
        aria-label="設定モーダルを閉じる"
        type="button"
      />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <button className={styles.close} onClick={onClose} aria-label="閉じる" type="button">
          ×
        </button>
        <div className={styles.body}>
          <section className={styles.info} aria-labelledby="settings-modal-title">
            <header className={styles.header}>
              <h2 id="settings-modal-title">設定</h2>
            </header>

            <div className={styles['section-grid']}>
              <section className={styles.section} aria-labelledby="settings-photo-folder-primary">
                <h3 id="settings-photo-folder-primary">写真フォルダ 1st</h3>
                <div className={styles['path-row']}>
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
              </section>

              <section className={styles.section} aria-labelledby="settings-photo-folder-secondary">
                <h3 id="settings-photo-folder-secondary">写真フォルダ 2nd</h3>
                <div className={styles['path-row']}>
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
              </section>
            </div>

            <div className={styles['section-grid']}>
              <section className={styles.section} aria-labelledby="settings-startup">
                <h3 id="settings-startup">ログイン時に起動</h3>
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

              <section className={styles.section} aria-labelledby="settings-theme">
                <h3 id="settings-theme">表示テーマ</h3>
                <div className={styles['toggle-row']}>
                  <p className={styles['toggle-text']}>
                    ベーステーマをダークモードへ切り替えます。
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
            </div>

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
                  className={styles['action-button']}
                  onClick={onResolveUnknownWorldsFromSimilarPhotos}
                  disabled={isSimilarResolutionRunning}
                  type="button"
                >
                  {isSimilarResolutionRunning ? '類似推測中...' : '類似写真から推測'}
                </button>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="settings-tag-master">
              <h3 id="settings-tag-master">タグマスタ</h3>
              <div className={styles['tag-editor']}>
                <input
                  className={styles['tag-input']}
                  type="text"
                  value={tagDraft}
                  placeholder="タグを追加"
                  onChange={(event) => {
                    setTagDraft(event.target.value);
                  }}
                  onKeyDown={handleTagKeyDown}
                />
                <button
                  className={styles['primary-button']}
                  onClick={submitTagMaster}
                  type="button"
                >
                  追加
                </button>
              </div>
              <div className={styles['tag-list']}>
                {masterTags.length === 0 ? (
                  <div className={styles['tag-empty']}>タグマスタはまだありません。</div>
                ) : (
                  <ul>
                    {masterTags.map((tag) => (
                      <li key={tag} className={styles['tag-item']}>
                        <span className={styles['tag-name']}>{tag}</span>
                        <button
                          className={styles['tag-remove']}
                          onClick={() => {
                            onDeleteTagMaster(tag);
                          }}
                          aria-label={`${tag} を削除`}
                          type="button"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
};
