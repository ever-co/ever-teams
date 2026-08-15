import { initPlasmicLoader } from '@plasmicapp/loader-nextjs';

export const initializePlasmicLoader = async (projectId: string, apiKey: string) => {
  const PLASMIC_CONFIG = {
    projects: [{ id: projectId, token: apiKey }],
    preview: true,
  };

  try {
    const plasmicLoader = initPlasmicLoader(PLASMIC_CONFIG);
    const plasmicPath = '/';
    const data = await plasmicLoader.maybeFetchComponentData(plasmicPath);

    if (!data?.entryCompMetas?.length) {
      throw new Error('No Plasmic data found');
    }

    return {
      prefetchedData: data,
      pageMeta: data.entryCompMetas[0]
    };
  } catch (error) {
    console.error('Error fetching Plasmic data:', error);
    throw error;
  }
};