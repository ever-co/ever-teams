'use client';

import { BlocksList } from './blocks-list';
import { BlockStorageService } from './storage';
import { VisualBuilderHeader } from '../../components/layouts/visual-builder-header';
import { useMemo } from 'react';

export default function BlocksPage() {
    const storageService = useMemo(() => new BlockStorageService(), []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <VisualBuilderHeader
                title=""
                platform=""
                onTitleChange={() => { }}
                hidePlatform={true}
                logoSize="large"
                hideEditButton={true}
                hideBackButton={true}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <BlocksList />
            </div>
        </div>
    );
}
