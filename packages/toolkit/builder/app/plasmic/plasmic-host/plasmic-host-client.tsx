'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { initPlasmicLoader, PlasmicCanvasHost, PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { PlasmicClientRootProvider } from '../plasmic-init-client';
import { usePlasmicStudio } from '../hooks/use-plasmic-studio';
import { usePlasmicStorage } from '../hooks/use-plasmic-storage';
import { usePlasmicService } from '../hooks/use-plasmic-service';
import { STORAGE_KEYS } from '../../constants';
import { VisualBuilderHeader } from '../../../components/layouts/visual-builder-header';
import { Sidebar } from './sidebar';
import { LoadingMessage } from './loading-message';
import { NoApiKeyMessage } from './no-api-key-message';
import { ErrorMessage } from './error-message';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BlockStorageService, BuilderPlatform, Block, isPlasmicConfig } from '../../blocks/storage';
import { TENANT } from '../../constants';

const MAX_RETRIES = 2;

export function PlasmicHostClient() {
  const isStudio = usePlasmicStudio();
  const [pageMeta, setPageMeta] = React.useState<any>(null);
  const [prefetchedData, setPrefetchedData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [retryAttempt, setRetryAttempt] = React.useState(0);
  const [error, setError] = React.useState<Error | null>(null);
  const {
    plasmicApiKey,
    projectId,
    updateStorage,
    setPlasmicApiKey,
    setProjectId
  } = usePlasmicStorage();
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [isEditingProjectId, setIsEditingProjectId] = useState(false);
  const [title, setTitle] = useState('Plasmic Block');
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockId = searchParams.get('id');
  const storageService = React.useMemo(() => new BlockStorageService(), []);
  const [block, setBlock] = useState<Block | null>(null);
  const [blockLoading, setBlockLoading] = useState(true);
  const ignoreRef = useRef(false);

  const updateBlockInStorage = async (updates: Partial<Block>) => {
    if (!block) return;
    const { data: updated } = await storageService.updateBlock(
      { tenantId: TENANT.ID, orgId: TENANT.ORG_ID },
      block.id,
      {
        ...updates,
        updatedAt: new Date(),
      }
    );
    setBlock(updated);
    if (updates.title) setTitle(updates.title);
  };

  const handleTitleChange = async (newTitle: string) => {
    await updateBlockInStorage({ title: newTitle });
  };

  const handleCredentialUpdate = async (type: 'apiKey' | 'projectId', value: string) => {
    setPrefetchedData(null);
    setPageMeta(null);
    setError(null);
    setRetryAttempt(0);

    const storageKey = type === 'apiKey' ?
      STORAGE_KEYS.PLASMIC_API_KEY :
      STORAGE_KEYS.PLASMIC_PROJECT_ID;

    updateStorage(storageKey, value);

    if (block) {
      const newConfig = {
        ...block.config,
        [type === 'apiKey' ? 'plasmicApiKey' : 'plasmicProjectId']: value,
      };
      await updateBlockInStorage({ config: newConfig });
    }

    if (type === 'apiKey') {
      setIsEditingApiKey(false);
      setPlasmicApiKey(value);
    } else {
      setIsEditingProjectId(false);
      setProjectId(value);
    }
  };

  const initializePlasmic = React.useCallback(async () => {
    let retryCount = 0;

    if (!isStudio && plasmicApiKey && projectId) {
      setPrefetchedData(null);
      setPageMeta(null);
      setError(null);
      setIsLoading(true);
      setRetryAttempt(0);

      const attemptInitialization = async () => {
        try {
          const PLASMIC_CONFIG = {
            projects: [
              {
                id: projectId,
                token: plasmicApiKey,
              },
            ],
            preview: true,
          };

          const newPlasmicLoader = initPlasmicLoader({
            ...PLASMIC_CONFIG,
            preview: true,
          });

          const data = await newPlasmicLoader.maybeFetchComponentData('/');

          if (!data || data.entryCompMetas.length === 0) {
            throw new Error('No Plasmic data found');
          }

          setPrefetchedData(data);
          setPageMeta(data.entryCompMetas[0]);
          setRetryAttempt(0);
        } catch (error) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setRetryAttempt(retryCount);
            console.log(`Retrying initialization (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            return attemptInitialization();
          }
          setError(error instanceof Error ? error : new Error('Failed to initialize Plasmic'));
          console.error('Error fetching Plasmic data:', error);
          setRetryAttempt(0);
        } finally {
          setIsLoading(false);
        }
      };

      return attemptInitialization();
    }
  }, [isStudio, plasmicApiKey, projectId]);

  React.useEffect(() => {
    initializePlasmic();
  }, [initializePlasmic]);

  useEffect(() => {
    ignoreRef.current = false;

    async function attemptBlockOperation() {
      let attempt = 0;

      while (attempt <= MAX_RETRIES) {
        try {
          if (blockId) {
            try {
              const { data: found, error: fetchError, errorCode } =
                await storageService.getBlockById(
                  { tenantId: TENANT.ID, orgId: TENANT.ORG_ID },
                  blockId
                );

              if (fetchError || errorCode) {
                console.warn('Block not found:', fetchError || `Error code: ${errorCode}`);
              } else if (found && found.builderPlatform === BuilderPlatform.Plasmic) {
                if (!ignoreRef.current) {
                  setBlock(found);
                  setTitle(found.title);
                  setBlockLoading(false);
                }
                return;
              } else if (found) {
                console.warn('Block found but not a Plasmic platform block');
              }
            } catch (error) {
              console.error('Failed to load block:', error);
              const isTransient =
                error instanceof Error &&
                /(network|quota|timeout)/i.test(error.message);
              if (!isTransient || attempt === MAX_RETRIES) {
                throw error;
              }
              attempt++;
              console.log(`Retrying block load (${attempt}/${MAX_RETRIES})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }

          const { data: newBlock } = await storageService.createBlock(
            { tenantId: TENANT.ID, orgId: TENANT.ORG_ID },
            {
              title: 'Plasmic Block',
              builderPlatform: BuilderPlatform.Plasmic,
              config: {},
            }
          );
          if (!newBlock) {
            throw new Error('Failed to create new block');
          }
          if (!ignoreRef.current) {
            router.replace(`/plasmic/plasmic-host?id=${newBlock.id}`);
            setBlock(newBlock);
            setTitle(newBlock.title);
            setBlockLoading(false);
          }
          return;
        } catch (error) {
          console.error('Failed to create block:', error);
          const isTransient =
            error instanceof Error &&
            /(network|quota|timeout)/i.test(error.message);
          if (!isTransient || attempt === MAX_RETRIES) {
            throw error;
          }
          attempt++;
          console.log(`Retrying block creation (${attempt}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    }

    async function ensureBlock() {
      setBlockLoading(true);
      try {
        await attemptBlockOperation();
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to create block'));
        if (!ignoreRef.current) {
          setBlockLoading(false);
        }
      }
    }

    ensureBlock();
    return () => {
      ignoreRef.current = true;
    };
  }, [blockId, storageService, router]);

  const renderContent = () => {
    if (isStudio) {
      return <PlasmicCanvasHost />;
    }

    if (!plasmicApiKey || !projectId) {
      return <NoApiKeyMessage />;
    }

    if (isLoading) {
      return (
        <LoadingMessage
          message={retryAttempt > 0 ? `Retrying... (Attempt ${retryAttempt}/2)` : undefined}
        />
      );
    }

    if (error) {
      return <ErrorMessage error={error} onRetry={initializePlasmic} />;
    }

    if (!prefetchedData || !pageMeta) {
      return null;
    }

    return (
      <PlasmicClientRootProvider prefetchedData={prefetchedData} pageParams={pageMeta.params}>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Preview
            </h2>
            <Link
              href={`https://studio.plasmic.app/projects/${projectId}`}
              target="_blank"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium
                        text-slate-900 dark:text-slate-100 border border-slate-200
                        dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50
                        rounded-lg transition-colors duration-200"
            >
              Edit in Plasmic →
            </Link>
          </div>
          <PlasmicComponent component={pageMeta.displayName} />
        </div>
      </PlasmicClientRootProvider>
    );
  };

  if (blockLoading) {
    return <LoadingMessage message="Loading block..." />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <VisualBuilderHeader
        title={block?.title || 'Plasmic Block'}
        onTitleChange={handleTitleChange}
        platform="Plasmic"
      />
      <div className="flex">
        {!isStudio && (
          <Sidebar
            plasmicApiKey={plasmicApiKey}
            projectId={projectId}
            isEditingApiKey={isEditingApiKey}
            isEditingProjectId={isEditingProjectId}
            onApiKeySubmit={(value: string) => handleCredentialUpdate('apiKey', value)}
            onProjectIdSubmit={(value: string) => handleCredentialUpdate('projectId', value)}
            onApiKeyReset={() => setIsEditingApiKey(true)}
            onProjectIdReset={() => setIsEditingProjectId(true)}
          />
        )}
        <main className="flex-1 ml-[25%]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
