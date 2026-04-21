import { AppIcon, APP_ICON_NAMES } from '../../../shared/components/Icons';
import styles from './ActionCards.module.css';

interface ActionCardsProps {
  startScan: () => void;
  cancelScan: () => void;
  scanStatus: string;
  setShowSettings: (val: boolean) => void;
  setIsFilterOpen: (val: boolean) => void;
}

// Dashboard-style action buttons for scan, settings, and filters.
export const ActionCards = ({
  startScan,
  cancelScan,
  scanStatus,
  setShowSettings,
  setIsFilterOpen,
}: ActionCardsProps) => {
  return (
    <div className={styles.grid}>
      {scanStatus === 'scanning' ? (
        <button
          className={[styles.card, styles.cancel].join(' ')}
          onClick={cancelScan}
          type="button"
        >
          <div className={styles.icon}>
            <AppIcon name={APP_ICON_NAMES.close} />
          </div>
          <div className={styles.info}>
            <h3>スキャンを中断</h3>
            <p>写真の再スキャンを停止します</p>
          </div>
        </button>
      ) : (
        <button className={styles.card} onClick={startScan} type="button">
          <div className={styles.icon}>
            <AppIcon name={APP_ICON_NAMES.refresh} />
          </div>
          <div className={styles.info}>
            <h3>再スキャン</h3>
            <p>写真を最新状態へ更新します</p>
          </div>
        </button>
      )}
      <button
        className={styles.card}
        onClick={() => {
          setShowSettings(true);
        }}
        type="button"
      >
        <div className={styles.icon}>
          <AppIcon name={APP_ICON_NAMES.settings} />
        </div>
        <div className={styles.info}>
          <h3>設定</h3>
          <p>フォルダと起動方法を変更します</p>
        </div>
      </button>
      <button
        className={styles.card}
        onClick={() => {
          setIsFilterOpen(true);
        }}
        type="button"
      >
        <div className={styles.icon}>
          <AppIcon name={APP_ICON_NAMES.search} />
        </div>
        <div className={styles.info}>
          <h3>絞り込み</h3>
          <p>条件検索パネルを開きます</p>
        </div>
      </button>
    </div>
  );
};
