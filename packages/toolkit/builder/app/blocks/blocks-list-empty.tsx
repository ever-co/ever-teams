import styles from './blocks-list.module.css';

interface BlocksListEmptyProps {
    onCreate: () => void;
}

export const BlocksListEmpty = ({ onCreate }: BlocksListEmptyProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-24">
            <h3 className="text-lg font-semibold text-gray-600 mb-2 dark:text-white">No Blocks Found</h3>
            <p className="text-zinc-400 mb-6">Create your first block to get started</p>
            <button
                className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={onCreate}
            >
                Create Block
            </button>
        </div>
    );
};
