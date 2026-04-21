import { useState, type KeyboardEvent } from 'react';
import styles from './WorkspacePanels.module.css';

interface TagMasterWorkspaceProps {
  masterTags: string[];
  onCreateTagMaster: (tag: string) => void;
  onDeleteTagMaster: (tag: string) => void;
}

// Main-area tag-master editor restored from the workspace-style UI flow.
export const TagMasterWorkspace = ({
  masterTags,
  onCreateTagMaster,
  onDeleteTagMaster,
}: TagMasterWorkspaceProps) => {
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

  return (
    <section className={styles.panel} aria-labelledby="tag-master-workspace-title">
      <div className={styles.body}>
        <section className={styles.info}>
          <header className={styles.header}>
            <h2 id="tag-master-workspace-title">タグマスタ編集</h2>
          </header>

          <section className={styles['memo-section']} aria-label="タグマスタ編集">
            <span className={styles.label}>タグを追加する</span>
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
              <button className={styles['primary-button']} onClick={submitTagMaster} type="button">
                追加
              </button>
            </div>
            <span className={styles.label}>追加済みタグ</span>
            <div className={styles['tag-list']}>
              {masterTags.length === 0 ? (
                <div className={styles['tag-empty']}>タグマスタはまだありません。</div>
              ) : (
                masterTags.map((tag) => (
                  <div key={tag} className={styles['tag-item']}>
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
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
};
