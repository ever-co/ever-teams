import dynamic from 'next/dynamic';
import { ProjectListSkeleton } from '../pages/projects/project-views/list-view/list-skeleton';
import { ProjectsGridSkeleton } from '../pages/projects/project-views/grid-view/grid-skeleton';

// Project Modals
export const LazyFiltersCardModal = dynamic(
	() => import('../projects/filters-card-modal').then((mod) => ({ default: mod.default })),
	{
		ssr: false
		// Note: No loading property for conditional modals
	}
);

export const LazyCreateProjectModal = dynamic(
	() => import('../features/projects/create-project-modal').then((mod) => ({ default: mod.CreateProjectModal })),
	{
		ssr: false
		// Note: No loading property for conditional modals
	}
);

export const LazyBulkArchiveProjectsModal = dynamic(
	() =>
		import('@/core/components/features/projects/bulk-actions/bulk-archive-projects-modal').then((mod) => ({
			default: mod.BulkArchiveProjectsModal
		})),
	{
		ssr: false
		// Note: No loading property for conditional modals
	}
);

export const LazyBulkRestoreProjectsModal = dynamic(
	() =>
		import('@/core/components/features/projects/bulk-actions/bulk-restore-projects-modal').then((mod) => ({
			default: mod.BulkRestoreProjectsModal
		})),
	{
		ssr: false
	}
);

// Project Views
export const LazyProjectsListView = dynamic(
	() => import('../pages/projects/project-views/list-view').then((mod) => ({ default: mod.ProjectsListView })),
	{
		ssr: false,
		loading: () => <ProjectListSkeleton />
	}
);

export const LazyProjectsGridView = dynamic(
	() => import('../pages/projects/project-views/grid-view').then((mod) => ({ default: mod.ProjectsGridView })),
	{
		ssr: false,
		loading: () => <ProjectsGridSkeleton />
	}
);

// Project Export
export const LazyProjectExportMenu = dynamic(
	() => import('../pages/projects/project-export-menu').then((mod) => ({ default: mod.ProjectExportMenu })),
	{
		ssr: false,
		loading: () => <div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);
