'use client';

import { useEffect, useEffectEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { Expand, X } from '@/core/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import {
	TaskCopyLinkButton,
	TaskDetailActionsMenu,
	TaskDetailPager,
	TaskDetailTimerButton,
	TaskFavoriteButton
} from '@/core/components/tasks/detail/task-detail-actions';
import { TaskDetailColumn } from '@/core/components/tasks/detail/task-detail-column';
import { TaskDetailHostProvider } from '@/core/components/tasks/detail/task-detail-host';
import { DETAIL_ICON_ACTION } from '@/core/components/tasks/detail/task-detail-recipes';
import { useTaskQueries } from '@/core/hooks';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { neighboursIn } from '@/core/lib/utils/task-detail';
import { isTrackingEnabledState } from '@/core/stores';
import { taskDrawerState } from '@/core/stores/tasks/task-drawer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskCommentComposer } from './task-drawer-comments';
import { TaskDrawerSkeleton } from './task-drawer-skeleton';

function OpenFullPageButton({ taskId, onClose }: Readonly<{ taskId: string; onClose: () => void }>) {
	const t = useTranslations();
	const label = t('taskDrawer.OPEN_FULL_PAGE');
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link href={`/task/${taskId}`} aria-label={label} onClick={onClose} className={DETAIL_ICON_ACTION}>
						<Expand aria-hidden="true" />
					</Link>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function DrawerHeader({ task, onClose }: Readonly<{ task: TTask; onClose: () => void }>) {
	const t = useTranslations();
	const { showTaskInDrawer } = useTaskDrawer();
	const { sequence, isOpen } = useAtomValue(taskDrawerState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const neighbours = neighboursIn(sequence, task.id);

	return (
		<header className="flex h-12 shrink-0 items-center gap-1 hairline-b border-border px-3">
			<TaskDetailPager
				previousId={neighbours.previousId}
				nextId={neighbours.nextId}
				position={neighbours.position}
				total={neighbours.total}
				onNavigate={showTaskInDrawer}
				keysEnabled={isOpen}
			/>
			<span className="flex-1" />
			{isTrackingEnabled && (
				<>
					<TaskDetailTimerButton task={task} />
					<span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
				</>
			)}
			<TaskFavoriteButton task={task} />
			<TaskCopyLinkButton task={task} />
			<OpenFullPageButton taskId={task.id} onClose={onClose} />
			<TaskDetailActionsMenu task={task} />
			<span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
			<button type="button" aria-label={t('common.CLOSE')} onClick={onClose} className={DETAIL_ICON_ACTION}>
				<X aria-hidden="true" />
			</button>
		</header>
	);
}

export function TaskDrawerBody({ task, onClose }: Readonly<{ task: TTask; onClose: () => void }>) {
	const { isOpen } = useAtomValue(taskDrawerState);
	const { shownTask, isReady } = useDetailedTask(task, isOpen);

	return (
		<TaskDetailHostProvider host="drawer">
			<DrawerHeader task={shownTask} onClose={onClose} />
			<div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto outline-none">
				<TaskDetailColumn task={shownTask} isReady={isReady} showsComposer={false} />
			</div>
			<footer className="shrink-0 hairline-t border-border bg-card px-5 py-3">
				<TaskCommentComposer task={shownTask} />
			</footer>
		</TaskDetailHostProvider>
	);
}

/** A task outside the team's list: its detail is read, and the drawer's frame waits for it. */
export function TaskDrawerLoading({ taskId }: Readonly<{ taskId: string }>) {
	const { getTaskById } = useTaskQueries();
	const loadTask = useEffectEvent((id: string) => {
		getTaskById(id);
	});

	useEffect(() => {
		loadTask(taskId);
	}, [taskId]);

	return <TaskDrawerSkeleton />;
}
