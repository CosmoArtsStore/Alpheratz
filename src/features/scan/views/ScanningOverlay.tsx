import type { ScanProgress } from '../models/types';
import styles from './ScanningOverlay.module.css';

interface ScanningOverlayProps {
  progress: ScanProgress;
  title?: string;
  description?: string;
  onCancel: () => void;
  canCancel?: boolean;
}

export const ScanningOverlay = ({
  progress,
  title = 'スキャン中...',
  description,
  onCancel,
  canCancel = true,
}: ScanningOverlayProps) => {
  const hasCurrentWorld = !!progress.current_world && progress.current_world !== 'Unknown world';

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.spinner} />
        <h3>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles['progress-container']}>
          <div className={styles['progress-bar']}>
            <div
              className={styles['progress-fill']}
              style={{
                width:
                  progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : '0%',
              }}
            />
          </div>
          <div className={styles['progress-text']}>
            {progress.processed} / {progress.total}
            {hasCurrentWorld && (
              <span className={styles['current-world']}> - {progress.current_world}</span>
            )}
          </div>
        </div>
        {canCancel && (
          <button className={styles['cancel-button']} onClick={onCancel} type="button">
            スキャンを中止
          </button>
        )}
      </div>
    </div>
  );
};
