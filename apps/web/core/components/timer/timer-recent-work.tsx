'use client';

import { useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { Play } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { useRecentWork } from '@/core/hooks/timer/use-recent-work';
import { cn } from '@/core/lib/helpers';
import type { RecentTask } from '@/core/lib/utils/time-entry-reuse';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const RECENT_ROW =
	'flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25';

const SKELETON_BAR = 'h-2.5 animate-pulse rounded-full bg-foreground/[0.06]';

const SKELETON_ROW_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2'];

function RecentWorkSkeleton() {
	return (
		<ul aria-hidden="true">
			{SKELETON_ROW_WIDTHS.map((width) => (
				<li key={width} className="flex min-h-8 items-center gap-2 px-2 py-1.5">
					<span className={cn(SKELETON_BAR, 'w-4')} />
					<span className={cn(SKELETON_BAR, width)} />
				</li>
			))}
		</ul>
	);
}

function RecentProject({ recent }: Readonly<{ recent: RecentTask }>) {
	if (!recent.projectName) {
		return null;
	}
	return (
		<span className="flex min-w-0 max-w-[40%] shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
			<EntityTile
				name={recent.projectName}
				color={recent.projectColor}
				imageUrl={recent.projectImageUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{recent.projectName}</span>
		</span>
	);
}

function RecentTaskRow({ recent, onStart }: Readonly<{ recent: RecentTask; onStart: (task: TTask) => void }>) {
	const t = useTranslations();
	const { task } = recent;
	return (
		<li>
			<button
				type="button"
				onClick={() => onStart(task)}
				aria-label={t('timeEntryActions.recent.START_ON', { task: task.title })}
				className={RECENT_ROW}
			>
				<TaskPropertyIcon kind="issueType" name={task.issueType} />
				{task.taskNumber && (
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{task.taskNumber}</span>
				)}
				<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{task.title}</span>
				<RecentProject recent={recent} />
				<Play aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			</button>
		</li>
	);
}

/**
 * The tasks the member tracked last, in the timer's task picker, above its list: one click starts the timer on one.
 * A member who tracked nothing lately gets no block at all. While the entries are read the block holds a place, and
 * its height follows what arrives, so the list under it never jumps; a failed read says so and offers to try again.
 */
export function TimerRecentWork({ onStart }: Readonly<{ onStart: (task: TTask) => void }>) {
	const t = useTranslations();
	const { recentTasks, isLoading, isError, retry } = useRecentWork();
	const title = t('timeEntryActions.recent.TITLE');
	const hasTasks = recentTasks.length > 0;
	const showsBlock = isLoading || isError || hasTasks;

	return (
		<AnimatedHeight>
			{showsBlock && (
				<section aria-label={title} aria-busy={isLoading} className="px-1 pb-1">
					<h3 className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{title}</h3>
					{isLoading && <RecentWorkSkeleton />}
					{isError && (
						<p
							role="alert"
							className="flex flex-wrap items-center gap-x-1 px-2 text-xs text-muted-foreground"
						>
							<span>{t('timeEntryActions.recent.ERROR')}</span>
							<Button type="button" variant="link" size="sm" onClick={() => void retry()}>
								{t('timeEntryActions.recent.RETRY')}
							</Button>
						</p>
					)}
					{hasTasks && (
						<ul>
							{recentTasks.map((recent) => (
								<RecentTaskRow key={recent.task.id} recent={recent} onStart={onStart} />
							))}
						</ul>
					)}
				</section>
			)}
		</AnimatedHeight>
	);
}
