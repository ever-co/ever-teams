interface ErrorMessageProps {
    error: Error;
    onRetry: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                Failed to load Plasmic content
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
                {error.message}
            </p>
            <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                   hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                   rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
                   dark:focus:ring-blue-400"
            >
                Retry
            </button>
        </div>
    </div>
);
