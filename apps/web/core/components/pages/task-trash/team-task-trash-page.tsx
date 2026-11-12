'use client';

import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Trash } from '@/core/components/icons';
import { isTaskTrashEnabled } from '@/core/lib/utils/comments-trash-flags';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { TaskTrashList } from './task-trash-list';

/** The active team's trash (`/team/tasks/trash`, `NEXT_PUBLIC_TASK_TRASH_ENABLED`). */
export function TeamTaskTrashPage() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const title = t('taskTrash.TITLE');
	const breadcrumb = (
		<div className="flex min-w-0 items-center gap-2">
			<Trash className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<Breadcrumb
				paths={[
					{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
					{ title: t('sidebar.TEAMTASKS'), href: '/team/tasks' },
					{ title, href: '/team/tasks/trash' }
				]}
				className="min-w-0 text-sm"
			/>
		</div>
	);

	return (
		<PageLayout title={title} showTimer={isTrackingEnabled} breadcrumb={breadcrumb}>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
				<h1 className="text-lg font-semibold text-foreground">{title}</h1>
				{!isTaskTrashEnabled() && (
					<AnimatedEmptyState
						title={t('taskTrash.OFF_TITLE')}
						message={t('taskTrash.OFF_TEXT')}
						icon={<Trash />}
						minHeight="320px"
					/>
				)}
				{isTaskTrashEnabled() && !activeTeam?.id && (
					<AnimatedEmptyState
						title={t('taskTrash.NO_TEAM_TITLE')}
						message={t('taskTrash.NO_TEAM_TEXT')}
						icon={<Trash />}
						minHeight="320px"
					/>
				)}
				{isTaskTrashEnabled() && activeTeam?.id && <TaskTrashList teamId={activeTeam.id} projectId={null} />}
			</div>
		</PageLayout>
	);
}
