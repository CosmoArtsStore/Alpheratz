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
  masonryEnabled: boolean;
  onToggleMasonry: () => void;
  isUnknownWorldAnalysisRunning: boolean;
  unknownWorldAnalysisLabel: string | null;
  onStartUnknownWorldAnalysis: () => void;
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
  masonryEnabled,
  onToggleMasonry,
  isUnknownWorldAnalysisRunning,
  unknownWorldAnalysisLabel,
  onStartUnknownWorldAnalysis,
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

          <div className="settings-section-grid">
            <div className="memo-section">
              <label>ピンボード表示を有効化</label>
              <div className="settings-toggle-row">
                <div className="settings-toggle-copy">
                  <p className="startup-toggle-text">
                    有効にすると、Pinterest のような高さ違いのカードを並べるピンボード表示を使えるようになります。無効時はグリッド表示のみです。
                  </p>
                  <p className="settings-danger-text">
                    高負荷がかかります。
                  </p>
                </div>
                <button
                  className={`toggle-switch ${masonryEnabled ? "active" : ""}`}
                  onClick={onToggleMasonry}
                  aria-label="ピンボード表示を切り替える"
                  type="button"
                >
                  <span className="toggle-switch-knob" />
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section-grid">
            <div className="memo-section">
              <label>ワールド不明写真を一括分析</label>
              <div className="settings-toggle-copy">
                <p className="startup-toggle-text">
                  ワールド不明の写真に対して PDQ 分析をまとめて進めます。写真モーダルの類似写真探索を使う前準備として利用できます。
                </p>
                <div className="settings-path-row">
                  <button
                    className="save-button settings-action-button"
                    onClick={onStartUnknownWorldAnalysis}
                    disabled={isUnknownWorldAnalysisRunning}
                    type="button"
                  >
                    {isUnknownWorldAnalysisRunning ? "分析中..." : "一括分析を開始"}
                  </button>
                </div>
                {unknownWorldAnalysisLabel && (
                  <p className="startup-toggle-text">
                    {unknownWorldAnalysisLabel}
                  </p>
                )}
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
