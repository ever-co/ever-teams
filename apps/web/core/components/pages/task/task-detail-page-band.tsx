'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ChevronRight } from '@/core/components/icons';
import {
	TaskCopyLinkButton,
	TaskDetailActionsMenu,
	TaskDetailPager,
	TaskDetailTimerButton,
	TaskFavoriteButton,
	TaskNumberButton
} from '@/core/components/tasks/detail/task-detail-actions';
import { DETAIL_ICON_ACTION } from '@/core/components/tasks/detail/task-detail-recipes';
import { epicAboveParentOf } from '@/core/components/tasks/detail/task-parent-field';
import { taskNumberOf } from '@/core/components/tasks/detail/task-picker-menu';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { neighboursIn } from '@/core/lib/utils/task-detail';
import { isTrackingEnabledState } from '@/core/stores';
import { taskDrawerState } from '@/core/stores/tasks/task-drawer';
import type { TTask } from '@/core/types/schemas/task/task.schema';

function crumbsOf(task: TTask) {
	const crumbs: TTask[] = [];
	const epic = epicAboveParentOf(task);
	const parent = task.parent ?? null;
	if (epic) {
		crumbs.push(epic);
	}
	if (parent && task.parentId) {
		crumbs.push(parent);
	}
	return crumbs;
}

function Crumb({ task }: Readonly<{ task: TTask }>) {
	const number = taskNumberOf(task);
	return (
		<TaskDrawerLink
			taskId={task.id}
			title={task.title}
			className="flex min-w-0 max-w-56 items-center gap-1.5 rounded-md px-1 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<TaskPropertyIcon kind="issueType" name={task.issueType ?? undefined} className="size-4" />
			{number && <span className="shrink-0 tabular-nums">#{number}</span>}
			<span className="truncate">{task.title}</span>
		</TaskDrawerLink>
	);
}

interface SessionHistory {
	currentEntry?: { index: number } | null;
}

/** The Navigation API lists only this app's entries of the tab; null where the browser does not have it. */
function hasPreviousEntryInApp() {
	const sessionHistory = (window as Window & { navigation?: SessionHistory }).navigation;
	const currentEntry = sessionHistory?.currentEntry;
	if (!currentEntry) {
		return null;
	}
	return currentEntry.index > 0;
}

/** A task link opened from another site in the same tab has history, but its previous page is outside the app. */
function tabStartedOnThisPage() {
	const [documentLoad] = performance.getEntriesByType('navigation');
	if (!documentLoad) {
		return false;
	}
	const startPath = new URL(documentLoad.name).pathname;
	return startPath === window.location.pathname;
}

function useGoBack() {
	const router = useRouter();
	return useCallback(() => {
		let hasPreviousAppPage = hasPreviousEntryInApp();
		if (hasPreviousAppPage === null) {
			const hasHistory = window.history.length > 1;
			hasPreviousAppPage = hasHistory && !tabStartedOnThisPage();
		}
		if (hasPreviousAppPage) {
			router.back();
			return;
		}
		router.replace('/');
	}, [router]);
}

export function TaskDetailPageBand({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const router = useRouter();
	const goBack = useGoBack();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { sequence } = useAtomValue(taskDrawerState);
	const neighbours = neighboursIn(sequence, task.id);
	const crumbs = crumbsOf(task);
	const openTask = useCallback((taskId: string) => router.push(`/task/${taskId}`), [router]);

	return (
		<div className="flex h-11 min-w-0 items-center gap-1.5 px-3 sm:px-4">
			<button type="button" aria-label={t('common.BACK')} onClick={goBack} className={DETAIL_ICON_ACTION}>
				<ArrowLeft aria-hidden="true" />
			</button>
			<span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
			<TaskPropertyIcon kind="issueType" name={task.issueType ?? undefined} className="size-5 rounded-[6px]" />
			<TaskNumberButton task={task} />
			{crumbs.length > 0 && (
				<span className="flex min-w-0 items-center gap-0.5 max-md:hidden">
					{crumbs.map((crumb) => (
						<span key={crumb.id} className="flex min-w-0 items-center gap-0.5">
							<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
							<Crumb task={crumb} />
						</span>
					))}
				</span>
			)}
			<span className="min-w-2 flex-1" />
			{isTrackingEnabled && (
				<>
					<TaskDetailTimerButton task={task} />
					<span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
				</>
			)}
			<span className="max-sm:hidden">
				<TaskDetailPager
					previousId={neighbours.previousId}
					nextId={neighbours.nextId}
					position={neighbours.position}
					total={neighbours.total}
					onNavigate={openTask}
				/>
			</span>
			<TaskFavoriteButton task={task} />
			<span className="max-sm:hidden">
				<TaskCopyLinkButton task={task} />
			</span>
			<TaskDetailActionsMenu task={task} />
		</div>
	);
}
