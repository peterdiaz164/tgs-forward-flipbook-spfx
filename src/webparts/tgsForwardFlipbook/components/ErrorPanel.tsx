import * as React from 'react';
import styles from './ErrorPanel.module.scss';
import { IPageProbeResult } from '../utils/types';

export interface IErrorPanelProps {
  message: string;
  baseUrl: string;
  probeResults: IPageProbeResult[];
}

const ErrorPanel: React.FC<IErrorPanelProps> = ({ message, baseUrl, probeResults }) => {
  const displayResults = probeResults.slice(0, 5);

  return (
    <div className={styles.errorPanel}>
      <h2 className={styles.title}>Flipbook could not load</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.details}>
        <p className={styles.detailTitle}>Base folder URL</p>
        <p className={styles.probeRow}>{baseUrl || '(not configured)'}</p>

        {displayResults.length > 0 && (
          <>
            <p className={styles.detailTitle} style={{ marginTop: 12 }}>
              Probe results (first {displayResults.length})
            </p>
            {displayResults.map((r) => (
              <div key={r.index} className={styles.probeRow}>
                <span className={r.valid ? styles.valid : styles.invalid}>
                  [{r.valid ? 'OK' : 'FAIL'}]
                </span>{' '}
                {r.url} &mdash; HTTP {r.status}, content-type: {r.contentType || '(none)'}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ErrorPanel;
