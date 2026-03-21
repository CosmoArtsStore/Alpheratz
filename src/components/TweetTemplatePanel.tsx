interface TweetTemplatePanelProps {
  tweetTemplateDraft: string;
  setTweetTemplateDraft: (value: string) => void;
  editingTweetTemplate: string | null;
  handleCancelTweetTemplateEdit: () => void;
  handleSaveTweetTemplate: () => Promise<void>;
  tweetTemplates: string[];
  activeTweetTemplate: string;
  handleSelectTweetTemplate: (template: string) => Promise<void>;
  handleStartTweetTemplateEdit: (template: string) => void;
  handleDeleteTweetTemplate: (template: string) => Promise<void>;
}

export const TweetTemplatePanel = ({
  tweetTemplateDraft,
  setTweetTemplateDraft,
  editingTweetTemplate,
  handleCancelTweetTemplateEdit,
  handleSaveTweetTemplate,
  tweetTemplates,
  activeTweetTemplate,
  handleSelectTweetTemplate,
  handleStartTweetTemplateEdit,
  handleDeleteTweetTemplate,
}: TweetTemplatePanelProps) => (
  <div className="workspace-panel template-workspace-panel">
    <div className="workspace-panel-body tweet-template-workspace-body">
      <div className="workspace-panel-content">
        <div className="info-header"><h2>テンプレート編集</h2></div>
        <div className="memo-section">
          <label>{editingTweetTemplate ? "テンプレート編集" : "新規テンプレート"}</label>
          <textarea
            className="tweet-template-textarea"
            value={tweetTemplateDraft}
            onChange={(event) => setTweetTemplateDraft(event.target.value)}
            placeholder={`例:\nWorld: {world-name}\nAuthor:\n\n#VRChat_world紹介`}
          />
          <div className="tweet-template-help">
            使える置換: {"{world-name}"}
          </div>
          <div className="tweet-template-editor-actions">
            {editingTweetTemplate && (
              <button
                className="modal-secondary-button template-editor-button"
                onClick={handleCancelTweetTemplateEdit}
                type="button"
              >
                キャンセル
              </button>
            )}
            <button
              className="save-button template-editor-button"
              onClick={() => void handleSaveTweetTemplate()}
              type="button"
            >
              {editingTweetTemplate ? "更新" : "登録"}
            </button>
          </div>
        </div>
      </div>
      <div className="workspace-panel-content tweet-template-list-panel">
        <div className="info-header"><h2>テンプレート一覧</h2></div>
        <div className="memo-section">
          <label>登録済みテンプレート</label>
          <div className="tweet-template-list">
            {tweetTemplates.map((template) => (
              <div
                key={template}
                className={`tweet-template-item ${template === activeTweetTemplate ? "active" : ""}`}
              >
                <button
                  className="tweet-template-select"
                  onClick={() => void handleSelectTweetTemplate(template)}
                  type="button"
                >
                  <span className="tweet-template-item-title">
                    {template === activeTweetTemplate ? "使用中" : "テンプレート"}
                  </span>
                  <span className="tweet-template-item-body">{template}</span>
                </button>
                <div className="tweet-template-item-actions">
                  <button
                    className="tweet-template-action-button tweet-template-action-button-edit"
                    onClick={() => handleStartTweetTemplateEdit(template)}
                    type="button"
                  >
                    編集
                  </button>
                  <button
                    className="tweet-template-action-button tweet-template-action-button-delete"
                    onClick={() => void handleDeleteTweetTemplate(template)}
                    type="button"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
