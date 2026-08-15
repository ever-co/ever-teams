import { useState, useEffect, useCallback } from 'react';
import { initPlasmicLoader } from '@plasmicapp/loader-nextjs';

interface PlasmicData {
  prefetchedData: any;
  pageMeta: any;
}

export const usePlasmicService = (projectId: string, apiKey: string) => {
  const [plasmicData, setPlasmicData] = useState<PlasmicData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initializePlasmic = useCallback(async (signal?: AbortSignal) => {
    if (!projectId || !apiKey) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const PLASMIC_CONFIG = {
        projects: [
          {
            id: projectId,
            token: apiKey,
          },
        ],
        preview: true,
      };

      const plasmicLoader = initPlasmicLoader({
        ...PLASMIC_CONFIG,
        preview: true,
      });

      if (signal?.aborted) return;

      const data = await plasmicLoader.maybeFetchComponentData('/');

      if (signal?.aborted) return;

      if (!data || data.entryCompMetas.length === 0) {
        throw new Error('No Plasmic data found');
      }

      setPlasmicData({
        prefetchedData: data,
        pageMeta: data.entryCompMetas[0]
      });
    } catch (err) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err : new Error('Failed to initialize Plasmic'));
        console.error('Error initializing Plasmic:', err);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [projectId, apiKey]);

  useEffect(() => {
    const abortController = new AbortController();
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        if (isSubscribed) {
          await initializePlasmic(abortController.signal);
        }
      } catch (error) {
        if (isSubscribed) {
          console.error('Error in effect:', error);
        }
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
      abortController.abort();
    };
  }, [initializePlasmic]);

  return { plasmicData, isLoading, error, reInitialize: initializePlasmic };
};
