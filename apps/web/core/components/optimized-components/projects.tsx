import dynamic from 'next/dynamic';

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
		loading: () => (
			<div className="w-full h-64 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Projects List...</div>
			</div>
		)
	}
);

export const LazyProjectsGridView = dynamic(
	() => import('../pages/projects/project-views/grid-view').then((mod) => ({ default: mod.ProjectsGridView })),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-64 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Projects Grid...</div>
			</div>
		)
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
