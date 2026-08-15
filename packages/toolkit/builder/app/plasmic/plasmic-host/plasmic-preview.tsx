import { PlasmicClientRootProvider } from '../plasmic-init-client';
import Link from 'next/link';
import { PlasmicComponent } from '@plasmicapp/loader-nextjs';
import { ComponentRenderData } from '@plasmicapp/loader-nextjs';

interface PageMeta {
  params: Record<string, string>;
  displayName: string;
  entry?: boolean;
}

interface PlasmicPreviewProps {
  prefetchedData: ComponentRenderData;
  pageMeta: PageMeta;
  projectId: string;
}

export const PlasmicPreview: React.FC<PlasmicPreviewProps> = ({
  prefetchedData,
  pageMeta,
  projectId
}) => (
  <PlasmicClientRootProvider prefetchedData={prefetchedData} pageParams={pageMeta.params}>
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Preview
        </h2>
        <Link
          href={`https://studio.plasmic.app/projects/${projectId}`}
          target="_blank"
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-900 
                    dark:text-slate-100 border border-slate-200 dark:border-slate-800 
                    hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg 
                    transition-colors duration-200"
        >
          Edit in Plasmic →
        </Link>
      </div>
      <PlasmicComponent component={pageMeta.displayName} />
    </div>
  </PlasmicClientRootProvider>
);
