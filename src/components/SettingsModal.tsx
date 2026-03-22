interface SettingsModalProps {
  onClose?: () => void;
  photoFolderPath: string;
  secondaryPhotoFolderPath: string;
  handleChooseFolder: (slot: 1 | 2) => void;
  handleResetFolder: (slot: 1 | 2) => void;
  startupEnabled: boolean;
  onToggleStartup: () => void;
  themeMode: "light" | "dark";
  onToggleTheme: () => void;
  embedded?: boolean;
}

export const SettingsModal = ({
  onClose,
  photoFolderPath,
  secondaryPhotoFolderPath,
  handleChooseFolder,
  handleResetFolder,
  startupEnabled,
  onToggleStartup,
  themeMode,
  onToggleTheme,
  embedded = false,
}: SettingsModalProps) => {
  const containerClassName = embedded
    ? "workspace-panel settings-workspace-panel"
    : "modal-content settings-panel settings-panel-wide";
  const bodyClassName = embedded ? "workspace-panel-body" : "modal-body";
  const contentClassName = embedded ? "workspace-panel-content" : "modal-info";

  const content = (
    <div className={containerClassName} onClick={(event) => event.stopPropagation()}>
      {!embedded && onClose && (
        <button className="modal-close" onClick={onClose} aria-label="閉じる" type="button">
          ×
        </button>
      )}
      <div className={bodyClassName} style={embedded ? undefined : { gridTemplateColumns: "1fr" }}>
        <div className={contentClassName}>
          <div className="info-header">
            <h2>設定</h2>
          </div>

          <div className="settings-section-grid">
            <div className="memo-section">
              <label>写真フォルダ 1st</label>
              <div className="settings-path-row">
                <input className="settings-path-input" type="text" value={photoFolderPath} readOnly />
                <button className="save-button settings-action-button" onClick={() => handleChooseFolder(1)} type="button">
                  変更
                </button>
                <button className="settings-reset-button" onClick={() => handleResetFolder(1)} type="button">
                  リセット
                </button>
              </div>
            </div>

            <div className="memo-section">
              <label>写真フォルダ 2nd</label>
              <div className="settings-path-row">
                <input className="settings-path-input" type="text" value={secondaryPhotoFolderPath} readOnly />
                <button className="save-button settings-action-button" onClick={() => handleChooseFolder(2)} type="button">
                  変更
                </button>
                <button className="settings-reset-button" onClick={() => handleResetFolder(2)} type="button">
                  リセット
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section-grid">
            <div className="memo-section">
              <label>ログイン時に起動</label>
              <div className="settings-toggle-row">
                <p className="startup-toggle-text">
                  Windows ログイン時に Alpheratz を自動起動します。
                </p>
                <button
                  className={`toggle-switch ${startupEnabled ? "active" : ""}`}
                  onClick={onToggleStartup}
                  aria-label="ログイン時起動を切り替える"
                  type="button"
                >
                  <span className="toggle-switch-knob" />
                </button>
              </div>
            </div>

            <div className="memo-section">
              <label>表示テーマ</label>
              <div className="settings-toggle-row">
                <p className="startup-toggle-text">
                  ベース配色をダークテーマへ切り替えます。再起動は不要です。
                </p>
                <button
                  className={`toggle-switch ${themeMode === "dark" ? "active" : ""}`}
                  onClick={onToggleTheme}
                  aria-label="ダークテーマを切り替える"
                  type="button"
                >
                  <span className="toggle-switch-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="modal-overlay" onClick={onClose}>{content}</div>;
};
