'use client';

import { type ReactNode, Suspense, useCallback } from 'react';
import { useStore } from 'jotai';
import { useTranslations } from 'next-intl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/core/components/common/dropdown-menu';
import { AddManualTimeModalSkeleton } from '@/core/components/common/skeleton/calendar-component-skeletons';
import {
	type TimeEntryReuseHandlers,
	TimeEntryReuseMenuItems
} from '@/core/components/dashboards/timesheets/time-entry-reuse';
import { Button } from '@/core/components/duplicated-components/_button';
import { MoreHorizontal } from '@/core/components/icons';
import { LazyAddManualTimeModal } from '@/core/components/optimized-components/calendar';
import { TimerTaskStartLayer } from '@/core/components/timer/timer-task-start';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTimeEntryContinue } from '@/core/hooks/timer/use-time-entry-continue';
import { useTimerTaskStart } from '@/core/hooks/timer/use-timer-task-start';
import { type TimeEntryDuplicateState, useTimeEntryDuplicate } from '@/core/hooks/timesheet/use-time-entry-duplicate';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { DiaryTask } from '@/core/lib/utils/dashboards/work-diary';
import {
	ADD_TIME_STEP_MINUTES,
	copiedFieldsOf,
	isTaskOfferedToAddTime,
	latestLogOfTask
} from '@/core/lib/utils/time-entry-reuse';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

function DiaryTaskMenu({
	title,
	log,
	reuse
}: Readonly<{ title: string; log: ITimeLog; reuse: TimeEntryReuseHandlers }>) {
	const t = useTranslations();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('timeEntryActions.TASK_ACTIONS', { task: title })}
					className="shrink-0 text-muted-foreground"
				>
					<MoreHorizontal />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-40">
				<TimeEntryReuseMenuItems log={log} reuse={reuse} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Continue and Duplicate on the tasks of a Work diary day. A row adds a task's entries of the day up: Continue takes
 * the billable status and the notes of the latest one, Duplicate copies the row's time. The time tracked without a
 * task has no menu, since both actions need a task.
 */
export function useDiaryTaskReuse(entries: ReadonlyArray<CalendarEntry>) {
	const t = useTranslations();
	const timerStart = useTimerTaskStart();
	const { canContinue, continueLog } = useTimeEntryContinue(timerStart.startOn);
	const duplicate = useTimeEntryDuplicate({ stepMinutes: ADD_TIME_STEP_MINUTES });
	const openDuplicate = duplicate.open;
	const store = useStore();
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const userId = user?.id;

	// Offered on a task the Add time dialog still lists, so the copy keeps its task: read when the menu shows
	const canDuplicate = useCallback(
		(log: ITimeLog) => {
			const viewer = { teamId: store.get(activeTeamState)?.id, userId, isTeamManager };
			return isTaskOfferedToAddTime(copiedFieldsOf(log).taskId, store.get(tasksByTeamState), viewer);
		},
		[isTeamManager, store, userId]
	);

	const renderTaskActions = useCallback(
		(task: DiaryTask): ReactNode => {
			if (task.isUntasked) {
				return null;
			}
			const dayLogs = entries.map((entry) => entry.log);
			const log = latestLogOfTask(dayLogs, task.key) ?? task.log;
			const title = log.task?.title ?? task.log.task?.title ?? t('dashboard.timesheets.NO_TASK');
			const reuse: TimeEntryReuseHandlers = {
				canContinue,
				continueLog,
				canDuplicate,
				duplicate: (copied) => {
					void openDuplicate({ log: copied, seconds: task.seconds });
				}
			};
			const offersAny = canContinue(log) || canDuplicate(log);
			if (!offersAny) {
				return null;
			}
			return <DiaryTaskMenu title={title} log={log} reuse={reuse} />;
		},
		[canContinue, canDuplicate, continueLog, entries, openDuplicate, t]
	);

	return { renderTaskActions, startRequest: timerStart.request, duplicate };
}

export type DiaryTaskReuse = ReturnType<typeof useDiaryTaskReuse>;

function DiaryDuplicateDialog({ duplicate }: Readonly<{ duplicate: TimeEntryDuplicateState }>) {
	const draft = duplicate.draft;
	if (!duplicate.isOpen || !draft) {
		return null;
	}
	return (
		<Suspense fallback={<AddManualTimeModalSkeleton />}>
			<LazyAddManualTimeModal
				key={draft.id}
				isOpen={duplicate.isOpen}
				closeModal={duplicate.close}
				params="AddTime"
				initialStart={draft.start}
				initialEnd={draft.end}
				prefill={draft}
				checkBeforeSave={duplicate.checkBeforeSave}
				refusalOfOverlap={duplicate.refusalOfOverlap}
			/>
		</Suspense>
	);
}

export function DiaryTaskReuseLayers({ reuse }: Readonly<{ reuse: DiaryTaskReuse }>) {
	return (
		<>
			<TimerTaskStartLayer request={reuse.startRequest} />
			<DiaryDuplicateDialog duplicate={reuse.duplicate} />
		</>
	);
}
