'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { LAST_SELECTED_PROJECTS_VIEW } from '@/core/constants/config/constants';
import type { ProjectsView } from '@/core/lib/utils/project-list';
import { PROJECTS_TOOLBAR_SEPARATOR, ProjectsCountSkeleton, ProjectsListSkeleton } from './list/projects-list-states';

const SCOPE_SEGMENTS = [
	{ labelWidth: 'w-10', hasCount: true },
	{ labelWidth: 'w-14', hasCount: true }
];

const ACTION_WIDTHS = ['w-24', 'w-36'];

const SEARCH_WIDTHS = ['w-full sm:w-60'];

const TRAILING_WIDTHS = ['w-30', 'w-21', 'w-24'];

const STORED_GRID_VIEWS = new Set(['"GRID"', 'GRID']);

function subscribeToNothing() {
	return () => {};
}

function readStoredView(): ProjectsView {
	try {
		const stored = window.localStorage.getItem(LAST_SELECTED_PROJECTS_VIEW);
		const storedView = stored ?? '';
		const isGrid = STORED_GRID_VIEWS.has(storedView);
		if (isGrid) {
			return 'GRID';
		}
		return 'LIST';
	} catch {
		return 'LIST';
	}
}

function readServerView(): ProjectsView {
	return 'LIST';
}

/** Read only: `useLocalStorageState` rewrites legacy values, which a skeleton must not do. */
function useStoredProjectsView() {
	return useSyncExternalStore(subscribeToNothing, readStoredView, readServerView);
}

export function ProjectsToolbarSkeleton() {
	const t = useTranslations();
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">
						{t('pages.projects.projectTitle.PLURAL')}
					</h1>
					<ProjectsCountSkeleton />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SegmentedControlSkeleton segments={SCOPE_SEGMENTS} />
					<span className={PROJECTS_TOOLBAR_SEPARATOR} />
					<ToolbarPills widths={ACTION_WIDTHS} />
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2 pb-3">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
					<ToolbarPills widths={SEARCH_WIDTHS} />
				</div>
				<div className="flex items-center gap-2">
					<ToolbarPills widths={TRAILING_WIDTHS} />
				</div>
			</div>
		</div>
	);
}

export function ProjectsPageSkeleton() {
	const view = useStoredProjectsView();
	return (
		<PageSkeletonFrame toolbar={<ProjectsToolbarSkeleton />}>
			<ProjectsListSkeleton view={view} />
		</PageSkeletonFrame>
	);
}
