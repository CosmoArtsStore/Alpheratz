import styles from './WorkspacePanels.module.css';

interface TweetTemplateWorkspaceProps {
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

// Main-area tweet-template editor restored from the workspace-style UI flow.
export const TweetTemplateWorkspace = ({
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
}: TweetTemplateWorkspaceProps) => (
  <section className={styles.panel} aria-labelledby="tweet-template-edit-title">
    <div className={styles['split-body']}>
      <section className={styles.info} aria-labelledby="tweet-template-edit-title">
        <header className={styles.header}>
          <h2 id="tweet-template-edit-title">投稿テンプレート</h2>
        </header>
        <section className={styles['memo-section']} aria-label="テンプレート編集">
          <p>{editingTweetTemplate ? 'テンプレート編集' : '新規テンプレート'}</p>
          <textarea
            className={styles.textarea}
            value={tweetTemplateDraft}
            onChange={(event) => {
              setTweetTemplateDraft(event.target.value);
            }}
            placeholder={`例:\nWorld: {world-name}\nAuthor:\n\n#VRChat_world紹介`}
          />
          <p className={styles['template-help']}>使える置換: {'{world-name}'}</p>
          <footer className={styles['template-actions']}>
            {editingTweetTemplate && (
              <button
                className={styles['secondary-button']}
                onClick={handleCancelTweetTemplateEdit}
                type="button"
              >
                キャンセル
              </button>
            )}
            <button
              className={styles['primary-button']}
              onClick={() => void handleSaveTweetTemplate()}
              type="button"
            >
              {editingTweetTemplate ? '更新' : '登録'}
            </button>
          </footer>
        </section>
      </section>

      <section
        className={[styles.info, styles['list-panel']].join(' ')}
        aria-labelledby="tweet-template-list-title"
      >
        <header className={styles.header}>
          <h2 id="tweet-template-list-title">テンプレート一覧</h2>
        </header>
        <section className={styles['memo-section']} aria-label="登録済みテンプレート">
          <p>登録済みテンプレート</p>
          <ul className={styles['template-list']}>
            {tweetTemplates.map((template) => (
              <li
                key={template}
                className={[
                  styles['template-item'],
                  template === activeTweetTemplate ? styles.active : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  className={styles['template-select']}
                  onClick={() => void handleSelectTweetTemplate(template)}
                  type="button"
                >
                  <span className={styles['template-item-title']}>
                    {template === activeTweetTemplate ? '使用中' : 'テンプレート'}
                  </span>
                  <span className={styles['template-item-body']}>{template}</span>
                </button>
                <footer
                  className={styles['template-item-actions']}
                  role="group"
                  aria-label="テンプレート操作"
                >
                  <button
                    className={styles['secondary-button']}
                    onClick={() => {
                      handleStartTweetTemplateEdit(template);
                    }}
                    type="button"
                  >
                    編集
                  </button>
                  <button
                    className={styles['danger-button']}
                    onClick={() => void handleDeleteTweetTemplate(template)}
                    type="button"
                  >
                    削除
                  </button>
                </footer>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  </section>
);
