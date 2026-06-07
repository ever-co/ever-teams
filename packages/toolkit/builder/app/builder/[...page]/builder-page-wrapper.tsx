'use client';

import { useState, useRef, useMemo } from 'react';
import { BuilderErrorBoundary } from './error-boundary';
import BuilderPageClient from './builder-page-client';
import { CONFIG, TENANT } from '../../constants';
import { getUrlPath, normalizePageUrl, getValidBuilderUrl } from '@/utils/helpers';
import { useBuilderApiKey } from '../hooks/use-builder-api-key';
import { useBuilderContent } from '../hooks/use-builder-content';
import { useBuilderPreview } from '../hooks/use-builder-preview';
import { ApiKeyForm } from './api-key-form';
import { ApiKeyDisplay } from './api-key-display';
import { ContentPreview } from './content-preview';
import { InstructionsSection } from './instruction-session';
import { BuilderUrlForm } from './builder-url-form';
import { VisualBuilderHeader } from '../../../components/layouts/visual-builder-header';
import { UserNavAvatar } from '../../../components/UserNavAvatar';
import { BlockStorageService, Block, BuilderPlatform, isBuilderIoConfig } from '../../blocks/storage';
import { BuilderFallbackModal } from './builder-fallback-modal';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEnsureBlock } from './use-ensure-block';

const DEFAULT_BUILDER_URL = process.env.NEXT_PUBLIC_DEFAULT_BUILDER_URL || '/builder/builder-demo';

interface BuilderPageWrapperProps {
    pageParams: string[];
}

export default function BuilderPageWrapper({ pageParams }: BuilderPageWrapperProps) {
    const [key, setKey] = useState(0);
    const urlPath = getUrlPath(pageParams);
    const { apiKey, isInitialized, updateApiKey, resetApiKey } = useBuilderApiKey();
    const { content, refetchContent } = useBuilderContent(apiKey, isInitialized, urlPath);
    const { isPreviewMode } = useBuilderPreview();
    const router = useRouter();
    const searchParamsObj = useSearchParams();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    const tenantId = TENANT.ID;
    const orgId = TENANT.ORG_ID;
    const storageService = useMemo(() => new BlockStorageService(), []);
    const blockIdRef = useRef<string | null>(null);

    const [pageUrl, setPageUrl] = useState<string>('');
    const [title, setTitle] = useState<string>('Builder');
    const [block, setBlock] = useState<Block | null>(null);
    const [showFallbackModal, setShowFallbackModal] = useState(false);
    const [fallbackTitle, setFallbackTitle] = useState('');
    const [fallbackUrl, setFallbackUrl] = useState('');

    const id = searchParamsObj.get('id');

    // Use custom hook for block management
    useEnsureBlock({
        id,
        pathname,
        storageService,
        tenantId,
        orgId,
        updateApiKey,
        onBlockLoaded: (block, title, pageUrl) => {
            setBlock(block);
            setTitle(title);
            setPageUrl(pageUrl);
            blockIdRef.current = block.id;
            setShowFallbackModal(false);
            setIsLoading(false);
        },
        onError: (errorTitle, errorUrl) => {
            setFallbackTitle(errorTitle);
            setFallbackUrl(errorUrl);
            setIsLoading(false);
            setShowFallbackModal(true);
        }
    });

    const updateCurrentBlock = async (updates: Partial<{ title: string; config: any }>) => {
        const blockId = blockIdRef.current;
        if (!blockId) {
            console.warn('[updateCurrentBlock] No blockId found, cannot update block.');
            return false;
        }

        const { error } = await storageService.updateBlock(
            { tenantId, orgId },
            blockId,
            updates
        );
        if (error) {
            console.error('[updateCurrentBlock] failed:', error);
            return false;
        }
        return true;
    };

    const handlePageUrlChange = async (newUrl: string) => {
        const normalizedUrl = normalizePageUrl(newUrl);

        const success = await updateCurrentBlock({
            config: { builderIoPageUrl: normalizedUrl }
        });

        if (!success) {
            return;
        }

        setPageUrl(normalizedUrl);
        await refetchContent();
        const safeUrl = getValidBuilderUrl(normalizedUrl, DEFAULT_BUILDER_URL);
        const href = `${safeUrl}?id=${encodeURIComponent(blockIdRef.current ?? '')}`;
        router.push(href);
    };

    const handleTitleChange = async (newTitle: string) => {
        setTitle(newTitle);
        await updateCurrentBlock({
            title: newTitle,
            config: { builderIoPageUrl: pageUrl }
        });
    };

    const handleApiKeySubmit = async (newKey: string) => {
        const success = await updateCurrentBlock({
            config: {
                builderIoPageUrl: pageUrl,
                builderApiKey: newKey
            }
        });

        if (success) {
            updateApiKey(newKey);
            setKey((prev) => prev + 1);
            await refetchContent();
        }
    };

    const handleApiKeyReset = async () => {
        const success = await updateCurrentBlock({
            config: {
                builderIoPageUrl: pageUrl,
                builderApiKey: undefined
            }
        });

        if (success) {
            resetApiKey();
            setKey((prev) => prev + 1);
            await refetchContent();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!pageUrl) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950">
                {showFallbackModal && (
                    <BuilderFallbackModal
                        open={showFallbackModal}
                        onOpenChange={setShowFallbackModal}
                        title={fallbackTitle}
                        setTitle={setFallbackTitle}
                        url={fallbackUrl}
                        setUrl={setFallbackUrl}
                        onSubmit={async (e) => {
                            e.preventDefault();

                            if (!fallbackTitle.trim()) {
                                console.warn('Title is required');
                                return;
                            }
                            if (!fallbackUrl.trim()) {
                                console.warn('URL is required');
                                return;
                            }

                            try {
                                const validUrl = getValidBuilderUrl(fallbackUrl, DEFAULT_BUILDER_URL);
                                const { data: newBlock, error: createError } = await storageService.createBlock(
                                    { tenantId, orgId },
                                    {
                                        title: fallbackTitle.trim(),
                                        builderPlatform: BuilderPlatform.BuilderIO,
                                        config: { builderIoPageUrl: validUrl }
                                    }
                                );

                                if (createError) {
                                    throw new Error(`Failed to create block: ${createError}`);
                                }
                                if (!newBlock) {
                                    throw new Error('Failed to create block');
                                }

                                router.push(`${validUrl}?id=${newBlock.id}`);

                                setShowFallbackModal(false);
                                setIsLoading(false);
                            } catch (error) {
                                console.error('Failed to create fallback block:', error);
                            }
                        }}
                    />
                )}
                {!showFallbackModal && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No Builder.io Page URL Found</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Please set a valid Builder.io page URL to continue.</p>
                    </div>
                )}
            </div>
        );
    }

    if (isPreviewMode) {
        return (
            <BuilderErrorBoundary>
                <div className="min-h-screen w-full bg-white dark:bg-slate-950">
                    <main>
                        <BuilderPageClient key={key} content={content} builderModelName={CONFIG.BUILDER_MODEL_NAME} />
                    </main>
                </div>
            </BuilderErrorBoundary>
        );
    }

    return (
        <BuilderErrorBoundary>
            <div className="min-h-screen w-full bg-white dark:bg-slate-950">
                <VisualBuilderHeader
                    title={title}
                    onTitleChange={handleTitleChange}
                    platform="Builder.io"
                    userAvatar={<UserNavAvatar />}
                />
                <div className="flex">
                    <div className="w-1/4 flex-shrink-0 fixed top-20 bottom-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
                        <div className="p-4 sm:p-6">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                                Settings and Instructions
                            </h2>

                            <div className="space-y-6">
                                {!isInitialized ? (
                                    <ApiKeyForm onSubmit={handleApiKeySubmit} />
                                ) : (
                                    <ApiKeyDisplay apiKey={apiKey} onReset={handleApiKeyReset} />
                                )}
                                <div className="border-y border-slate-200 dark:border-slate-800 py-6">
                                    <BuilderUrlForm pageUrl={pageUrl} setPageUrl={handlePageUrlChange} />
                                </div>
                                <InstructionsSection />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 ml-[25%]">
                        <ContentPreview content={content} />
                        <main className="p-6">
                            <BuilderPageClient
                                key={key}
                                content={content}
                                builderModelName={CONFIG.BUILDER_MODEL_NAME}
                            />
                        </main>
                    </div>
                </div>
            </div>
        </BuilderErrorBoundary>
    );
}
