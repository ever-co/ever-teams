import styles from './blocks-list.module.css';

export const BlocksListLoading = () => {
    return (
        <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading blocks...</p>
        </div>
    );
};
