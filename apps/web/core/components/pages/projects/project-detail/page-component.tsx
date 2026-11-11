'use client';

import { useCallback, useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Folder, ShieldCheck } from '@/core/components/icons';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useProjectTaskStats } from '@/core/hooks/projects/use-project-task-stats';
import { isValidProjectForDisplay } from '@/core/lib/helpers/type-guards';
import { isProjectVisibleInTeam, sortProjects, urlWithParams } from '@/core/lib/utils/project-list';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { TOrganizationProject } from '@/core/types/schemas';
import { ProjectDetailHeader, type ProjectDetailTab, type ProjectNeighbours } from './project-detail-header';
import { ProjectOverview } from './project-overview';
import { ProjectTasksTab } from './project-tasks-tab';
import { ProjectPeopleTab } from './project-people-tab';
import { ProjectDocsTab } from './project-docs-tab';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { isTaskTrashEnabled } from '@/core/lib/utils/comments-trash-flags';
import { TaskTrashList } from '@/core/components/pages/task-trash/task-trash-list';
import { ProjectDetailBodySkeleton, ProjectDetailToolbarSkeleton } from './project-detail-skeleton';

const TAB_PARAM = 'tab';

const DETAIL_TABS: ReadonlySet<ProjectDetailTab> = new Set<ProjectDetailTab>(['overview', 'tasks', 'people', 'docs', 'trash']);

function tabOf(value: string | null): ProjectDetailTab {
	// The Docs tab exists only where Docs is on: a `?tab=docs` link elsewhere opens the overview.
	if (value === 'docs' && !isDocsEnabled()) return 'overview';
	// The same for the Trash tab, which exists only where the trash is on.
	if (value === 'trash' && !isTaskTrashEnabled()) return 'overview';
	const isKnown = DETAIL_TABS.has(value as ProjectDetailTab);
	if (isKnown) {
		return value as ProjectDetailTab;
	}
	return 'overview';
}

function neighboursOf(projects: TOrganizationProject[], project: TOrganizationProject | undefined): ProjectNeighbours {
	const empty: ProjectNeighbours = { position: 0, total: 0, previousId: null, nextId: null };
	if (!project) {
		return empty;
	}
	const isArchived = Boolean(project.isArchived);
	const siblings = projects.filter((candidate) => isValidProjectForDisplay(candidate, isArchived));
	const ordered = sortProjects(siblings, { id: 'name', desc: false });
	const index = ordered.findIndex((candidate) => candidate.id === project.id);
	if (index < 0) {
		return empty;
	}
	const previous = ordered[index - 1];
	const next = ordered[index + 1];
	return {
		position: index + 1,
		total: ordered.length,
		previousId: previous?.id ?? null,
		nextId: next?.id ?? null
	};
}

function isHiddenFromTeam(project: TOrganizationProject | undefined, activeTeamId: string | undefined) {
	if (!project) {
		return false;
	}
	return !isProjectVisibleInTeam(project, activeTeamId);
}

export default function ProjectDetailPageComponent() {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const params = useParams<{ id: string }>();
	const projectId = params?.id;
	const tab = tabOf(searchParams.get(TAB_PARAM));

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const activeTeam = useAtomValue(activeTeamState);
	const { taskStatuses } = useTaskStatusesQuery();
	const taskStats = useProjectTaskStats();
	const { organizationProjects } = useOrganizationProjectsQuery();

	const {
		data: project,
		isLoading,
		isError,
		refetch
	} = useQuery({
		queryKey: queryKeys.organizationProjects.detail(projectId),
		queryFn: () =>
			projectId
				? organizationProjectService.getOrganizationProject(projectId)
				: Promise.reject(new Error('Project ID is required')),
		enabled: !!projectId,
		retry: 1,
		staleTime: 1000 * 60 * 5
	});

	const teamProjects = useMemo(
		() => organizationProjects.filter((candidate) => isProjectVisibleInTeam(candidate, activeTeam?.id)),
		[activeTeam?.id, organizationProjects]
	);
	const neighbours = useMemo(() => neighboursOf(teamProjects, project), [project, teamProjects]);

	const setTab = useCallback(
		(nextTab: ProjectDetailTab) => {
			const next = new URLSearchParams(searchParams.toString());
			if (nextTab === 'overview') {
				next.delete(TAB_PARAM);
			}
			if (nextTab !== 'overview') {
				next.set(TAB_PARAM, nextTab);
			}
			router.replace(urlWithParams(pathname, next), { scroll: false });
		},
		[pathname, router, searchParams]
	);

	const isDenied = isHiddenFromTeam(project, activeTeam?.id);
	const taskCount = taskStatsCountOf(taskStats, project?.id);

	const projectsTitle = t('pages.projects.projectTitle.PLURAL');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: projectsTitle, href: '/projects' },
		{ title: project?.name || t('common.LOADING'), href: pathname }
	];
	const breadcrumb = (
		<div className="flex min-w-0 items-center gap-2">
			<Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
		</div>
	);

	if (isError) {
		return (
			<PageLayout title={projectsTitle} showTimer={isTrackingEnabled} breadcrumb={breadcrumb}>
				<AnimatedEmptyState
					title={t('pages.projects.detail.ERROR_TITLE')}
					message={t('pages.projects.detail.ERROR_MESSAGE')}
					actionLabel={t('pages.unauthorized.TRY_AGAIN')}
					actionVariant="outline"
					onAction={() => void refetch()}
					minHeight="420px"
				/>
			</PageLayout>
		);
	}

	if (isDenied) {
		return (
			<PageLayout title={projectsTitle} showTimer={isTrackingEnabled} breadcrumb={breadcrumb}>
				<AnimatedEmptyState
					title={t('pages.projects.accessDenied.title')}
					message={t('pages.projects.accessDenied.description', { teamName: activeTeam?.name || '' })}
					icon={<ShieldCheck />}
					actionLabel={t('pages.projects.accessDenied.viewAllProjects')}
					actionVariant="outline"
					onAction={() => router.push('/projects')}
					minHeight="420px"
				/>
			</PageLayout>
		);
	}

	const showsSkeleton = isLoading || !project;

	return (
		<PageLayout
			title={project?.name || projectsTitle}
			showTimer={isTrackingEnabled}
			breadcrumb={breadcrumb}
			mainHeaderSlot={
				<>
					{showsSkeleton && <ProjectDetailToolbarSkeleton />}
					{project && (
						<ProjectDetailHeader
							project={project}
							statuses={taskStatuses}
							neighbours={neighbours}
							tab={tab}
							onTabChange={setTab}
							taskCount={taskCount}
						/>
					)}
				</>
			}
		>
			{showsSkeleton && <ProjectDetailBodySkeleton />}
			{project && tab === 'overview' && (
				<ProjectOverview project={project} statuses={taskStatuses} taskStats={taskStats} />
			)}
			{project && tab === 'tasks' && (
				<ProjectTasksTab projectId={project.id} taskStats={taskStats} statuses={taskStatuses} />
			)}
			{project && tab === 'people' && <ProjectPeopleTab project={project} />}
			{project && tab === 'docs' && isDocsEnabled() && <ProjectDocsTab project={project} />}
			{project && tab === 'trash' && isTaskTrashEnabled() && (
				<div className="py-4">
					<TaskTrashList teamId={activeTeam?.id ?? null} projectId={project.id} showsProject={false} />
				</div>
			)}
		</PageLayout>
	);
}

/** The Tasks count only once the team's tasks are all loaded, so the switch never shows a partial number. */
function taskStatsCountOf(taskStats: ReturnType<typeof useProjectTaskStats>, projectId: string | undefined) {
	if (!projectId) {
		return undefined;
	}
	if (!taskStats.isReady) {
		return undefined;
	}
	const stats = taskStats.statsOf(projectId);
	return stats?.total ?? 0;
}
