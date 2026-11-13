'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Folder } from '@/core/components/icons';
import { LazyProjectExportMenu } from '@/core/components/optimized-components/projects';
import { CreateProjectModal } from '@/core/components/features/projects/create-project-modal';
import { BulkArchiveProjectsModal } from '@/core/components/features/projects/bulk-actions/bulk-archive-projects-modal';
import { BulkRestoreProjectsModal } from '@/core/components/features/projects/bulk-actions/bulk-restore-projects-modal';
import { useModal } from '@/core/hooks';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import { useProjectTaskStats } from '@/core/hooks/projects/use-project-task-stats';
import { useCanSeeProjectConsumption, useProjectConsumption } from '@/core/hooks/projects/use-project-consumption';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { sortProjectsWithConsumption } from '@/core/lib/utils/project-consumption';
import { isValidProjectForDisplay } from '@/core/lib/helpers/type-guards';
import { isSavedTeamLoading } from '@/core/lib/helpers/saved-team';
import {
	groupProjectsByStatus,
	isProjectVisibleInTeam,
	managersOf,
	projectMatchesDateRange,
	projectMatchesFilters,
	projectMatchesSearch,
	type ProjectStatusGroup
} from '@/core/lib/utils/project-list';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { ProjectViewDataType } from './project-views';
import { ProjectsToolbar } from './list/projects-toolbar';
import { useProjectFilterCategories } from './list/projects-filters';
import { ProjectsListView } from './list/projects-list-view';
import { ProjectsGridView } from './list/projects-grid-view';
import {
	ProjectsEmptyState,
	ProjectsErrorState,
	ProjectsListSkeleton,
	ProjectsSelectionBar
} from './list/projects-list-states';
import { ProjectsPageSkeleton } from './projects-page-skeleton';

const ALL_PROJECTS_GROUP = 'all';

function toExportRow(project: TOrganizationProject): ProjectViewDataType {
	return {
		project: { id: project.id, name: project.name, imageUrl: project.imageUrl, color: project.color },
		status: project.status,
		archivedAt: project.archivedAt ?? null,
		isArchived: project.isArchived,
		startDate: project.startDate,
		endDate: project.endDate,
		createdAt: project.createdAt,
		members: project.members,
		managers: managersOf(project),
		teams: project.teams
	};
}

function groupsOf(
	projects: TOrganizationProject[],
	isGrouped: boolean,
	statuses: Parameters<typeof groupProjectsByStatus>[1]
): ProjectStatusGroup[] {
	if (isGrouped) {
		return groupProjectsByStatus(projects, statuses);
	}
	return [{ key: ALL_PROJECTS_GROUP, name: null, status: undefined, items: projects }];
}

function ProjectsPage() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const {
		organizationProjects,
		getOrganizationProjectsLoading,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery();
	const { taskStatuses } = useTaskStatusesQuery();
	const showsConsumption = useCanSeeProjectConsumption();
	const list = useProjectsListState({ showsConsumption });
	const taskStats = useProjectTaskStats();
	const consumption = useProjectConsumption({ isEnabled: showsConsumption });
	const categories = useProjectFilterCategories(organizationProjects);

	const createModal = useModal();
	const archiveModal = useModal();
	const restoreModal = useModal();
	const hasOpenedCreate = useHasBeenOpen(createModal.isOpen);
	const hasOpenedArchive = useHasBeenOpen(archiveModal.isOpen);
	const hasOpenedRestore = useHasBeenOpen(restoreModal.isOpen);

	const teamProjects = useMemo(
		() => organizationProjects.filter((project) => isProjectVisibleInTeam(project, activeTeam?.id)),
		[activeTeam?.id, organizationProjects]
	);

	const counts = useMemo(
		() => ({
			active: teamProjects.filter((project) => isValidProjectForDisplay(project, false)).length,
			archived: teamProjects.filter((project) => isValidProjectForDisplay(project, true)).length
		}),
		[teamProjects]
	);

	const isArchivedScope = list.scope === 'archived';

	const shownProjects = useMemo(() => {
		const scoped = teamProjects.filter((project) => isValidProjectForDisplay(project, isArchivedScope));
		const dated = scoped.filter((project) => projectMatchesDateRange(project, list.dateRange));
		const filtered = dated.filter((project) => projectMatchesFilters(project, list.filters, taskStatuses));
		const searched = filtered.filter((project) => projectMatchesSearch(project, list.search));
		return sortProjectsWithConsumption(searched, list.ordering, consumption.rowOf);
	}, [
		consumption.rowOf,
		isArchivedScope,
		list.dateRange,
		list.filters,
		list.ordering,
		list.search,
		taskStatuses,
		teamProjects
	]);

	const isGrouped = list.grouping === 'status';
	const groups = useMemo(
		() => groupsOf(shownProjects, isGrouped, taskStatuses),
		[isGrouped, shownProjects, taskStatuses]
	);

	const shownIds = useMemo(() => shownProjects.map((project) => project.id), [shownProjects]);
	const selectedIds = list.selectedIds.filter((id) => shownIds.includes(id));
	const hasSelection = selectedIds.length > 0;

	const exportRows = useMemo(() => shownProjects.map(toExportRow), [shownProjects]);

	const hasSearch = list.search.trim().length > 0;
	const hasFilters = list.activeFilterCount > 0;
	const isNarrowed = hasSearch || hasFilters || list.hasDateRange;
	const isProjectsLoading = Boolean(getOrganizationProjectsLoading);
	const isTeamLoading = isSavedTeamLoading(Boolean(activeTeam));
	const isLoading = isProjectsLoading || isTeamLoading;
	const hasProjects = shownProjects.length > 0;
	const hasNoProjects = !hasProjects;
	const isTeamSettled = !isTeamLoading;
	const showsError = isOrganizationProjectsError && hasNoProjects && isTeamSettled;
	const showsEmpty = !isLoading && !showsError && !hasProjects;
	const showsList = !isLoading && hasProjects;
	const isListView = list.view === 'LIST';
	const showsConsumptionError = showsList && consumption.hasFailed;

	const clearSearchAndFilters = () => {
		list.setSearch('');
		list.clearFilters();
	};

	const pageTitle = t('pages.projects.projectTitle.PLURAL');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: pageTitle, href: '/projects' }
	];

	return (
		<PageLayout
			title={pageTitle}
			showTimer={isTrackingEnabled}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<ProjectsToolbar
					list={list}
					categories={categories}
					counts={counts}
					shownCount={shownProjects.length}
					isLoading={isLoading}
					exportMenu={<LazyProjectExportMenu projects={exportRows} activeTeam={activeTeam} />}
					onCreate={createModal.openModal}
				/>
			}
		>
			{isLoading && <ProjectsListSkeleton view={list.view} />}
			{showsError && <ProjectsErrorState onRetry={() => void refetchOrganizationProjects()} />}
			{showsEmpty && (
				<ProjectsEmptyState
					scope={list.scope}
					isNarrowed={isNarrowed}
					onClearFilters={clearSearchAndFilters}
					onCreate={createModal.openModal}
				/>
			)}
			{showsConsumptionError && (
				<DashboardErrorNotice
					title={t('pages.projects.consumption.LOAD_ERROR')}
					onRetry={consumption.retry}
					className="mb-3"
				/>
			)}
			{showsList && isListView && (
				<ProjectsListView
					list={list}
					groups={groups}
					statuses={taskStatuses}
					taskStats={taskStats}
					visibleProjectIds={shownIds}
					consumption={consumption}
				/>
			)}
			{showsList && !isListView && (
				<ProjectsGridView
					list={list}
					groups={groups}
					statuses={taskStatuses}
					taskStats={taskStats}
					consumption={consumption}
				/>
			)}
			{hasSelection && (
				<ProjectsSelectionBar
					count={selectedIds.length}
					scope={list.scope}
					onArchive={archiveModal.openModal}
					onRestore={restoreModal.openModal}
					onClear={list.clearSelection}
				/>
			)}

			{hasOpenedCreate && <CreateProjectModal open={createModal.isOpen} closeModal={createModal.closeModal} />}
			{hasOpenedArchive && (
				<BulkArchiveProjectsModal
					projectIds={selectedIds}
					open={archiveModal.isOpen}
					closeModal={archiveModal.closeModal}
				/>
			)}
			{hasOpenedRestore && (
				<BulkRestoreProjectsModal
					projectIds={selectedIds}
					open={restoreModal.isOpen}
					closeModal={restoreModal.closeModal}
				/>
			)}
		</PageLayout>
	);
}

export default withAuthentication(ProjectsPage, { displayName: 'ProjectsPage', skeleton: ProjectsPageSkeleton });
