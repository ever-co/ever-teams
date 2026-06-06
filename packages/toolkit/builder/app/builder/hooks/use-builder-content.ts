import { useState, useEffect, useCallback } from 'react';
import { builder } from "@builder.io/sdk";
import { BuilderContent } from '../../../types';
import { CONFIG } from '../../constants';

export const useBuilderContent = (
  apiKey: string, 
  isInitialized: boolean, 
  urlPath: string
) => {
  const [content, setContent] = useState<BuilderContent | null>(null);

  const fetchContent = useCallback(async () => {
    if (!apiKey || !isInitialized) return;

    try {
      const fetchedContent = await builder
        .get(CONFIG.BUILDER_MODEL_NAME, {
          userAttributes: { urlPath },
          options: { noCache: true }
        })
        .toPromise();

      setContent(fetchedContent);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  }, [apiKey, urlPath, isInitialized]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, refetchContent: fetchContent };
};
