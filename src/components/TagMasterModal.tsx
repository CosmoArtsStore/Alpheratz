import { KeyboardEvent, useState } from "react";

interface TagMasterModalProps {
  onClose?: () => void;
  masterTags: string[];
  onCreateTagMaster: (tag: string) => void;
  onDeleteTagMaster: (tag: string) => void;
  embedded?: boolean;
}

export const TagMasterModal = ({
  onClose,
  masterTags,
  onCreateTagMaster,
  onDeleteTagMaster,
  embedded = false,
}: TagMasterModalProps) => {
  const [tagDraft, setTagDraft] = useState("");
  const containerClassName = embedded
    ? "workspace-panel tag-master-workspace-panel"
    : "modal-content settings-panel tag-master-panel";
  const bodyClassName = embedded ? "workspace-panel-body" : "modal-body";
  const contentClassName = embedded ? "workspace-panel-content" : "modal-info";

  const submitTagMaster = () => {
    const normalized = tagDraft.trim();
    if (!normalized) {
      return;
    }
    onCreateTagMaster(normalized);
    setTagDraft("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTagMaster();
    }
  };

  const content = (
    <div className={containerClassName} onClick={(event) => event.stopPropagation()}>
      {!embedded && onClose && (
        <button className="modal-close" onClick={onClose} aria-label="閉じる" type="button">
          ×
        </button>
      )}
      <div className={bodyClassName} style={embedded ? undefined : { gridTemplateColumns: "1fr" }}>
        <div className={`${contentClassName} tag-master-panel-content`}>
          <div className="info-header">
            <h2>タグマスタ編集</h2>
          </div>
          <div className="memo-section tag-master-memo-section">
            <label>タグを追加する</label>
            <div className="tag-master-editor">
              <input
                type="text"
                value={tagDraft}
                placeholder="タグを追加"
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <button className="save-button settings-action-button" onClick={submitTagMaster} type="button">
                追加
              </button>
            </div>
            <div className="tag-master-list-label">追加済みタグ</div>
            <div className="tag-master-list">
              {masterTags.length === 0 ? (
                <div className="tag-master-empty">タグマスタはまだありません。</div>
              ) : (
                masterTags.map((tag) => (
                  <div key={tag} className="tag-master-item">
                    <span className="tag-master-name">{tag}</span>
                    <button
                      className="tag-master-remove"
                      onClick={() => onDeleteTagMaster(tag)}
                      aria-label={`${tag} を削除`}
                      type="button"
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
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
