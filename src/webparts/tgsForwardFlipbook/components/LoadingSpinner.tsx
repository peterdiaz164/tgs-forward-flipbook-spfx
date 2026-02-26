import * as React from 'react';
import styles from './LoadingSpinner.module.scss';

export interface ILoadingSpinnerProps {
  label?: string;
}

const LoadingSpinner: React.FC<ILoadingSpinnerProps> = ({ label }) => (
  <div className={styles.wrapper}>
    <div className={styles.spinner} />
    {label && <span className={styles.label}>{label}</span>}
  </div>
);

export default LoadingSpinner;
