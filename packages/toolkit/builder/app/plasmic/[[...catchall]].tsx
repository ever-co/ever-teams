import { PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { notFound } from 'next/navigation';
import {  PREVIEW_PLASMIC } from './plasmic-init';
import { PlasmicClientRootProvider } from './plasmic-init-client';
import '../../globals.css';


// Use revalidate if you want incremental static regeneration
export const revalidate = 60;

export default async function PlasmicLoaderPage({
  params,
  searchParams
}: {
  params?: { catchall: string[] | undefined };
  searchParams?: Record<string, string | string[]>;
}) {
  const plasmicComponentData = await fetchPlasmicComponentData(params?.catchall);
  if (!plasmicComponentData) { // deepscan-disable-line
    notFound();
  }

  const { prefetchedData } = plasmicComponentData;
  if (prefetchedData.entryCompMetas.length === 0) {
    notFound();
  }

  const pageMeta = prefetchedData.entryCompMetas[0];
  return (
    <PlasmicClientRootProvider prefetchedData={prefetchedData} pageParams={pageMeta.params} pageQuery={searchParams}>
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicClientRootProvider>
  );
}

async function fetchPlasmicComponentData(catchall: string[] | undefined) {
  const plasmicPath = '/' + (catchall ? catchall.join('/') : '');
  const prefetchedData = await PREVIEW_PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!prefetchedData) {
    notFound();
  }

  return { prefetchedData };
}

export async function generateStaticParams() {
  const pageModules = await PREVIEW_PLASMIC.fetchPages();
  return pageModules.map((mod) => {
    const catchall = mod.path === '/' ? undefined : mod.path.substring(1).split('/');
    return {
      catchall
    };
  });
}