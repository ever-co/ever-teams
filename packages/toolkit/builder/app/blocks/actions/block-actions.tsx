'use client';

import { useState } from 'react';
import { Block } from '../storage';
import { EditAction } from './edit-action';
import { DeleteDialog } from './delete-dialog';
// import { DownloadAction } from './download-action';
import { Trash2 } from 'lucide-react';

interface BlockActionsProps {
    block: Block;
    onDelete: (blockId: string) => Promise<void>;
}

export function BlockActions({ block, onDelete }: BlockActionsProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleDelete = async () => {
        await onDelete(block.id);
    };

    return (
        <div className="flex items-center gap-1">
            <EditAction block={block} />
            {/* <DownloadAction block={block} /> */}
            <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-400 hover:text-red-600 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                title="Delete block"
            >
                <Trash2 className="h-4 w-4" />
            </button>
            <DeleteDialog
                block={block}
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
