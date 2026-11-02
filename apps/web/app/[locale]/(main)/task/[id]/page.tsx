'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components';
import { FileSearch, Task } from '@/core/components/icons';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { TaskDetailPageBand } from '@/core/components/pages/task/task-detail-page-band';
import { TaskDetailPageBody } from '@/core/components/pages/task/task-detail-page-body';
import { TaskPageSkeleton } from '@/core/components/pages/task/task-page-skeleton';
import { TaskDetailBandSkeleton, TaskDetailPageSkeleton } from '@/core/components/tasks/detail/task-detail-skeleton';
import { taskNumberOf } from '@/core/components/tasks/detail/task-picker-menu';
import { useTaskQueries } from '@/core/hooks';
import { useTeamDailyPlansOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { activeTeamState, detailedTaskState, isTrackingEnabledState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

function TaskNotFound() {
	const t = useTranslations();
	return (
		<div className="flex min-h-100 flex-col items-center justify-center p-8 text-center">
			<div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-foreground/5">
				<FileSearch className="size-5 text-muted-foreground" />
			</div>
			<h2 className="mb-1 text-sm font-semibold text-balance text-foreground">
				{t('pages.taskDetails.TASK_NOT_FOUND')}
			</h2>
			<p className="mb-4 max-w-md text-sm text-muted-foreground">
				{t('pages.taskDetails.TASK_NOT_FOUND_DESCRIPTION')}
			</p>
			<Button variant="outline" size="default" asChild>
				<Link href="/">{t('pages.taskDetails.GO_BACK_HOME')}</Link>
			</Button>
		</div>
	);
}

function TaskLoadFailed({ onRetry, isRetrying }: Readonly<{ onRetry: () => void; isRetrying: boolean }>) {
	const t = useTranslations();
	return (
		<div className="flex min-h-100 flex-col items-center justify-center p-8 text-center">
			<div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-foreground/5">
				<FileSearch className="size-5 text-muted-foreground" />
			</div>
			<h2 className="mb-1 text-sm font-semibold text-balance text-foreground">
				{t('pages.error.HEADING_TITLE')}
			</h2>
			<p className="mb-4 max-w-md text-sm text-muted-foreground">{t('pages.error.HEADING_DESCRIPTION')}</p>
			<Button variant="outline" size="default" onClick={onRetry} loading={isRetrying} disabled={isRetrying}>
				{t('pages.unauthorized.TRY_AGAIN')}
			</Button>
		</div>
	);
}

function currentCrumbOf(task: TTask | null) {
	if (!task) {
		return '';
	}
	const number = taskNumberOf(task);
	if (!number) {
		return task.title;
	}
	return `#${number} ${task.title}`;
}

function useRequestedTask(taskId: string | undefined) {
	const detailedTask = useAtomValue(detailedTaskState);
	const { getTaskById, getTasksByIdLoading, getTaskByIdError } = useTaskQueries();
	const [attemptedTaskId, setAttemptedTaskId] = useState<string | null>(null);
	const [missingTaskId, setMissingTaskId] = useState<string | null>(null);
	// A failed load wins over the store, which can still hold the team list copy getTaskById puts there first
	const hasLoadFailed = Boolean(taskId) && getTaskByIdError?.taskId === taskId;
	const isTaskNotFound = getTaskByIdError?.isTaskNotFound === true;
	const isLoadError = hasLoadFailed && !isTaskNotFound;
	const isStoredTask = Boolean(detailedTask) && detailedTask?.id === taskId;
	const isRequestedTask = isStoredTask && !hasLoadFailed;
	const hasAttemptedLoad = Boolean(taskId) && attemptedTaskId === taskId;
	const isKnownMissing = Boolean(taskId) && missingTaskId === taskId;

	const loadTask = useEffectEvent(async (id: string) => {
		setAttemptedTaskId(id);
		const loaded = await getTaskById(id);
		if (!loaded) {
			setMissingTaskId(id);
		}
	});

	// After a failed load only the retry button sends it again, never every end of loading
	useEffect(() => {
		const canLoad = !isRequestedTask && !getTasksByIdLoading;
		const needsLoad = canLoad && !isKnownMissing;
		if (needsLoad && taskId) {
			void loadTask(taskId);
		}
	}, [getTasksByIdLoading, isKnownMissing, isRequestedTask, taskId]);

	const retry = useCallback(() => {
		if (taskId) {
			void getTaskById(taskId);
		}
	}, [getTaskById, taskId]);

	let task: TTask | null = null;
	if (isRequestedTask) {
		task = detailedTask;
	}
	const isWaiting = getTasksByIdLoading || !hasAttemptedLoad;
	const isLoading = !task && !hasLoadFailed && isWaiting;
	const isMissing = !task && !isLoading && !isLoadError;
	return { task, isLoading, isMissing, isLoadError, retry, isRetrying: getTasksByIdLoading };
}

const TaskDetails = () => {
	useTeamDailyPlansOwner();
	const t = useTranslations();
	const params = useParams();
	const taskId = params?.id as string | undefined;
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { task, isLoading, isMissing, isLoadError, retry, isRetrying } = useRequestedTask(taskId);
	const pageTitle = JSON.parse(t('pages.taskDetails.BREADCRUMB'));

	const breadcrumb = [
		{ title: activeTeam?.name || '', href: '/' },
		{ title: t('common.TASKS'), href: '/team/tasks' },
		{ title: currentCrumbOf(task), href: `/task/${taskId}` }
	];

	let documentTitle = pageTitle;
	if (task) {
		documentTitle = task.title;
	}

	return (
		<PageLayout
			title={documentTitle}
			showTimer={isTrackingEnabled}
			className="min-h-0 flex-1 p-0"
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Task className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumb} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<>
					{task && <TaskDetailPageBand task={task} />}
					{!task && isLoading && <TaskDetailBandSkeleton />}
				</>
			}
		>
			{isLoading && <TaskDetailPageSkeleton />}
			{task && <TaskDetailPageBody key={task.id} task={task} />}
			{isMissing && <TaskNotFound />}
			{isLoadError && <TaskLoadFailed onRetry={retry} isRetrying={isRetrying} />}
		</PageLayout>
	);
};

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails', skeleton: TaskPageSkeleton });
