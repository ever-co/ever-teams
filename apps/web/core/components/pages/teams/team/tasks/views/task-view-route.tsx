'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import type { TeamItem } from '@/core/components/teams/team-item';
import { useActiveTeam } from '@/core/hooks/organizations/teams/use-active-team';
import { useBuiltInViewTasks } from '@/core/hooks/task-views/use-built-in-view-tasks';
import { useTaskViewQuery } from '@/core/hooks/task-views/use-task-views-query';
import { activeTeamState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { isBuiltInViewKey } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { ETaskBuiltInView, ITaskView } from '@/core/types/interfaces/common/task-views';
import { TeamTasksPage } from '../list/team-tasks-page';
import { TeamTasksPageSkeleton } from '../team-tasks-page-skeleton';
import { ViewsBreadcrumb } from './views-breadcrumb';

/** A view that cannot open here says why, under the views' breadcrumb, with the way back to all of them. */
function ViewNotice({
	title,
	text,
	actionLabel,
	onAction
}: Readonly<{ title: string; text: string; actionLabel?: string; onAction?: () => void }>) {
	const t = useTranslations();
	return (
		<PageLayout title={t('taskViews.TITLE')} className="min-h-0 flex-1" breadcrumb={<ViewsBreadcrumb />}>
			<div className="flex h-full flex-col items-center justify-center gap-3 p-4">
				<AnimatedEmptyState title={title} message={text} actionLabel={actionLabel} onAction={onAction} />
				<Link href="/views" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
					{t('taskViews.BACK_TO_VIEWS')}
				</Link>
			</div>
		</PageLayout>
	);
}

/** A saved view of another team is shown once that team is the active one: its tasks are that team's. */
function OtherTeamView({ view }: Readonly<{ view: ITaskView }>) {
	const t = useTranslations();
	const teams = useAtomValue(organizationTeamsState);
	// The shell's own team change: a running timer is stopped before the switch, as from the team picker.
	const { onChangeActiveTeam } = useActiveTeam();
	const team = teams.find((item) => item.id === view.organizationTeamId);
	if (!team) {
		return <ViewNotice title={t('taskViews.NOT_FOUND_TITLE')} text={t('taskViews.NOT_FOUND_TEXT')} />;
	}
	return (
		<ViewNotice
			title={t('taskViews.OTHER_TEAM_TITLE', { team: team.name ?? '' })}
			text={t('taskViews.OTHER_TEAM_TEXT', { team: team.name ?? '' })}
			actionLabel={t('taskViews.SWITCH_TEAM', { team: team.name ?? '' })}
			onAction={() => onChangeActiveTeam({ data: team } as TeamItem)}
		/>
	);
}

function SavedViewPage({ viewId }: Readonly<{ viewId: string }>) {
	const t = useTranslations();
	const query = useTaskViewQuery(viewId);
	const activeTeam = useAtomValue(activeTeamState);
	if (query.isLoading) return <TeamTasksPageSkeleton />;
	if (query.isError || !query.data)
		return <ViewNotice title={t('taskViews.NOT_FOUND_TITLE')} text={t('taskViews.NOT_FOUND_TEXT')} />;
	const view = query.data;
	// The page lists the active team's tasks: a view saved for another team waits for that team to be active.
	if (view.organizationTeamId && activeTeam && view.organizationTeamId !== activeTeam.id) {
		return <OtherTeamView view={view} />;
	}
	return <TeamTasksPage viewContext={{ kind: 'saved', view }} />;
}

function BuiltInViewPage({ viewKey }: Readonly<{ viewKey: ETaskBuiltInView }>) {
	const { tasks, total, isLoading, isError, refetch } = useBuiltInViewTasks(viewKey);
	return (
		<TeamTasksPage
			viewContext={{
				kind: 'builtIn',
				key: viewKey,
				tasks,
				total,
				isLoading,
				isError,
				refetch: () => void refetch()
			}}
		/>
	);
}

/** `/views/[viewId]`: a saved view by id, or a built-in one by its key (`mine`, `this-week`, `overdue`, `due-soon`). */
export function TaskViewRoute() {
	const t = useTranslations();
	const params = useParams<{ viewId: string }>();
	const viewId = params?.viewId ?? '';
	if (!isTaskViewsEnabled()) {
		return <ViewNotice title={t('taskViews.UNAVAILABLE_TITLE')} text={t('taskViews.UNAVAILABLE_TEXT')} />;
	}
	if (isBuiltInViewKey(viewId)) {
		return <BuiltInViewPage key={viewId} viewKey={viewId} />;
	}
	return <SavedViewPage key={viewId} viewId={viewId} />;
}
