import { ReactNode } from 'react';
import styles from './HoverTooltip.module.css';

interface HoverTooltipProps {
  label: string;
  children: ReactNode;
  placement?: 'top';
  disabled?: boolean;
  className?: string;
}

export const HoverTooltip = ({
  label,
  children,
  placement: _placement = 'top',
  disabled = false,
  className = '',
}: HoverTooltipProps) => {
  void _placement;

  if (disabled) {
    return <>{children}</>;
  }

  const wrapperClassName = [styles.root, className].filter(Boolean).join(' ');

  return (
    <div className={wrapperClassName}>
      {children}
      <div className={styles.bubble} role="tooltip" aria-hidden="true">
        <div className={styles.inner}>{label}</div>
      </div>
    </div>
  );
};
