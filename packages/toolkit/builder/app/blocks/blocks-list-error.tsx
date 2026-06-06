import styles from './blocks-list.module.css';

interface BlocksListErrorProps {
    error: string;
    onRetry: () => void;
}

export const BlocksListError = ({ error, onRetry }: BlocksListErrorProps) => {
    return (
        <div className={styles.errorState}>
            <h3>Error Loading Blocks</h3>
            <p>{error}</p>
            <button
                className={`${styles.button} ${styles.retryButton}`}
                onClick={onRetry}
            >
                Try Again
            </button>
        </div>
    );
};
