'use client';

import { Block, BuilderPlatform } from '../storage';
import { Download } from 'lucide-react';

interface DownloadActionProps {
    block: Block;
}

export function DownloadAction({ block }: DownloadActionProps) {
    // Only show download for Craft.js and GrapesJS blocks
    if (![BuilderPlatform.CraftJS, BuilderPlatform.GrapesJS].includes(block.builderPlatform)) {
        return null;
    }

    const handleDownload = () => {
        try {
            // Create a blob with the block configuration
            const blob = new Blob([JSON.stringify(block.config, null, 2)], {
                type: 'application/json',
            });

            // Create a download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${block.title.toLowerCase().replace(/\s+/g, '-')}-config.json`;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download block configuration:', error);
            // You might want to show a toast notification here
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="text-green-400 hover:text-green-600 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
            title="Download configuration"
        >
            <Download className="h-4 w-4" />
        </button>
    );
}
