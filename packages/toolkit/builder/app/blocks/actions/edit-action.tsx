'use client';

import { useRouter } from 'next/navigation';
import { Block, BuilderPlatform, BuilderIoConfig } from '../storage/types';
import { Pencil, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface EditActionProps {
    block: Block;
}

export function EditAction({ block }: EditActionProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEdit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let editorPath = '';

            switch (block.builderPlatform) {
                case BuilderPlatform.BuilderIO:
                    if (!('builderIoPageUrl' in block.config) || typeof block.config.builderIoPageUrl !== 'string') {
                        setError('Builder.io URL not found or invalid in block config');
                        return;
                    }

                    const builderConfig = block.config as BuilderIoConfig;
                    const builderUrl = builderConfig.builderIoPageUrl;
                    editorPath = builderUrl.startsWith('/builder/') ? builderUrl : `/builder/${builderUrl.replace(/^\/+/, '')}`;
                    break;
                case BuilderPlatform.Plasmic:
                    editorPath = '/plasmic/plasmic-host';
                    break;
                case BuilderPlatform.GrapesJS:
                    editorPath = '/grapesjs';
                    break;
                case BuilderPlatform.CraftJS:
                    editorPath = '/craft';
                    break;
                default:
                    setError('Unknown builder platform: ' + block.builderPlatform);
                    return;
            }

            router.push(`${editorPath}?id=${block.id}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <button
                onClick={handleEdit}
                disabled={isLoading}
                className="text-blue-400 hover:text-blue-600 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit block"
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Pencil className="h-4 w-4" />
                )}
            </button>
            {error && (
                <div className="mt-2 text-sm text-red-500" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}
