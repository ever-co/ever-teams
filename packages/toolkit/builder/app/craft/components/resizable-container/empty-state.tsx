import React from 'react';

/**
 * Component shown when the container has no items
 */
export const EmptyContainerState: React.FC = () => {
    return (
        <div className="flex w-full justify-center items-center bg-transparent dark:text-slate-100 dark:bg-[#1E2025] rounded-md min-h-96 border border-dashed border-gray-300 dark:border-gray-700 transition-colors">
            <div className="flex flex-col items-center">
                <svg
                    className='text-gray-400 dark:text-gray-500 mb-2'
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                >
                    <path
                        className='dark:text-slate-100'
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2zM4 4v.01M8 4v.01M12 4v.01M16 4v.01M4 8v.01M4 12v.01M4 16v.01"
                    />
                </svg>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Drag atoms here.</p>
            </div>
        </div>
    );
};
