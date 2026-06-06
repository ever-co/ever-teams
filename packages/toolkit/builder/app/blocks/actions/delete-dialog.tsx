'use client';

import { useState } from 'react';
import { Block } from '../storage';

interface DeleteDialogProps {
    block: Block;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function DeleteDialog({ block, isOpen, onClose, onConfirm }: DeleteDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        try {
            setIsDeleting(true);
            setError(null);
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete block');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 text-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col overflow-x-hidden">
                <h2 className="text-2xl font-bold mb-6 text-center">Delete Block</h2>
                <p className="text-zinc-300 mb-8 text-base text-center whitespace-normal break-words">
                    Are you sure you want to delete the block <span className="font-bold text-white">&quot;{block.title}&quot;</span>? This action cannot be undone.
                </p>
                {error && (
                    <div className="bg-red-900 text-red-300 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}
                <div className="flex flex-row justify-center gap-3 w-full">
                    <button
                        onClick={onClose}
                        type="button"
                        disabled={isDeleting}
                        className="px-6 py-2 text-zinc-300 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        type="button"
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
