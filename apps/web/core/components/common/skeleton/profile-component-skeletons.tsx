import React, { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { ToolbarPills } from '@/core/components/layouts/page-skeleton';
import {
	TASK_LIST_SURFACE,
	TASK_ROW,
	TASK_ROW_CHIPS_CELL,
	TASK_ROW_DETAIL_CELL,
	TASK_ROW_MENU_CELL,
	TASK_ROW_META,
	TASK_ROW_SKELETON_BAR,
	TASK_ROW_STATUS_CELL,
	TASK_ROW_TASK_CELL,
	TASK_ROW_TIMER_CELL,
	TASK_ROW_TIMES,
	TASK_ROW_WORKED_CELL
} from '@/core/components/tasks/task-row-recipes';

const BAR = 'animate-pulse rounded-md bg-foreground/[0.06]';

const TASK_LIST_ROWS = 6;

const FILTER_TAB_LABEL_WIDTHS = ['w-12', 'w-16', 'w-20', 'w-14', 'w-10'];

/** Filter, Add time and Assign task, at their loaded widths. */
const FILTER_ACTION_WIDTHS = ['w-21', 'w-28', 'w-25'];

/**
 * Individual component skeletons for Profile page progressive loading
 * Used in dynamic imports and Suspense wrappers for optimal UX
 */

interface SkeletonProps {
	className?: string;
}

/** The member's identity in the profile toolbar: the 56px avatar, the name line with its menu, the e-mail. */
const UserProfileDetailSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex min-w-0 items-center gap-4', className)}>
			<div className={cn(BAR, 'size-14 shrink-0 rounded-full')} />
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex h-8 items-center">
					<div className={cn(BAR, 'h-4 w-36')} />
				</div>
				<div className="flex h-4 items-center">
					<div className={cn(BAR, 'h-3 w-44')} />
				</div>
			</div>
		</div>
	);
};

/**
 * A task row of `TaskCard` while it loads, on the row's own grid: one line from a 64rem list, two below it. The timer
 * and menu cells stay empty, the other cells hold thin bars at the height of what replaces them.
 */
export const TaskCardSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={cn(TASK_ROW, className)} aria-hidden="true">
			<div className={TASK_ROW_TIMER_CELL} />
			<div className={TASK_ROW_TASK_CELL}>
				<span className={cn(TASK_ROW_SKELETON_BAR, 'size-4 shrink-0 rounded-[28%]')} />
				<span className={cn(TASK_ROW_SKELETON_BAR, 'h-2.5 w-3/5 max-w-72')} />
			</div>
			<div className={TASK_ROW_META}>
				<div className={cn(TASK_ROW_CHIPS_CELL, 'flex h-5 items-center gap-1')}>
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-5 w-16 rounded-[5px]')} />
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-5 w-12 rounded-[5px]')} />
				</div>
				<div className={cn(TASK_ROW_WORKED_CELL, TASK_ROW_TIMES)}>
					<span className="flex h-4 items-center">
						<span className={cn(TASK_ROW_SKELETON_BAR, 'h-2 w-20')} />
					</span>
					<span className="flex h-4 items-center">
						<span className={cn(TASK_ROW_SKELETON_BAR, 'h-2 w-16')} />
					</span>
				</div>
				<div className={cn(TASK_ROW_DETAIL_CELL, 'flex h-9 items-center')}>
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-2.5 w-28')} />
				</div>
				<div className={cn(TASK_ROW_STATUS_CELL, 'flex h-7 items-center')}>
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-2.5 w-20')} />
				</div>
			</div>
			<div className={TASK_ROW_MENU_CELL} />
		</div>
	);
};

export const TaskCardBlockSkeleton = () => (
	<div className="flex flex-col gap-y-4">
		{[...Array(5)].map((_, index) => (
			<TaskCardSkeleton
				key={index}
				className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5"
			/>
		))}
	</div>
);

/** The profile task list while it loads: one surface of task rows split by hairlines, as the loaded list. */
export const UserProfileTaskSkeleton: FC<SkeletonProps> = ({ className }) => {
	const rowKeys = Array.from({ length: TASK_LIST_ROWS }, (_, index) => index);
	return (
		<output aria-busy="true" className={cn('block w-full', className)}>
			<ul className={TASK_LIST_SURFACE}>
				{rowKeys.map((key) => (
					<li key={key}>
						<TaskCardSkeleton />
					</li>
				))}
			</ul>
		</output>
	);
};

/**
 * The apps and visited sites lists while their chunk loads: one hour label, then a surface of ranked share rows
 * (share, name over its visit, a meter from a 28rem row, the time), the geometry of `ActivityShareGroups`.
 */
export const AppsTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	const rowKeys = [0, 1, 2];
	return (
		<div className={cn('flex w-full flex-col gap-2', className)} aria-hidden="true">
			<div className="flex min-h-8 items-center">
				<span className={cn('h-2.5 w-28', TASK_ROW_SKELETON_BAR)} />
			</div>
			<div className="rounded-xl bg-card px-4 py-1 hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
				{rowKeys.map((key) => (
					<div key={key} className="@container">
						<div className="grid min-h-11 grid-cols-[2.75rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 py-2 @md:grid-cols-[2.75rem_minmax(0,1fr)_minmax(4rem,9rem)_4.5rem]">
							<span className={cn('h-2.5 w-7', TASK_ROW_SKELETON_BAR)} />
							<span className="flex min-w-0 flex-col gap-2 py-0.5">
								<span className={cn('h-2.5 w-2/3', TASK_ROW_SKELETON_BAR)} />
								<span className={cn('h-2 w-1/3', TASK_ROW_SKELETON_BAR)} />
							</span>
							<span className={cn('h-1 w-full @max-md:hidden', TASK_ROW_SKELETON_BAR)} />
							<span className={cn('ml-auto h-2.5 w-12', TASK_ROW_SKELETON_BAR)} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/** The visited sites list shares the apps list's geometry. */
export const VisitedSitesTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <AppsTabSkeleton className={className} />;
};

/**
 * The screenshots view while its chunk loads: the day's two figures, then one hour of slot tiles (frame, range and
 * activity, actions), the geometry of `ScreenshootTab`.
 */
export const ScreenshootTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	const figureWidths = ['w-20', 'w-16'];
	const tileKeys = [0, 1, 2, 3];
	return (
		<div className={cn('flex w-full flex-col gap-5', className)} aria-hidden="true">
			<div className="flex flex-wrap items-end gap-x-8 gap-y-3">
				{figureWidths.map((width) => (
					<div key={width} className="flex flex-col gap-2 py-0.5">
						<span className={cn('h-2.5 w-14', TASK_ROW_SKELETON_BAR)} />
						<span className={cn('h-3.5', width, TASK_ROW_SKELETON_BAR)} />
					</div>
				))}
			</div>
			<div className="flex flex-col gap-2">
				<div className="flex min-h-8 items-center">
					<span className={cn('h-2.5 w-24', TASK_ROW_SKELETON_BAR)} />
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-3 gap-y-5">
					{tileKeys.map((key) => (
						<div key={key} className="flex flex-col gap-1.5">
							<span className="block aspect-[16/10] w-full animate-pulse rounded-md bg-foreground/[0.04]" />
							<div className="flex min-h-5 items-center justify-between gap-2">
								<span className={cn('h-2.5 w-20', TASK_ROW_SKELETON_BAR)} />
								<span className={cn('h-2.5 w-14', TASK_ROW_SKELETON_BAR)} />
							</div>
							<div className="flex h-7 items-center gap-3">
								<span className={cn('h-2.5 w-14', TASK_ROW_SKELETON_BAR)} />
								<span className={cn('h-2.5 w-10', TASK_ROW_SKELETON_BAR)} />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

/**
 * The profile's tab row while the tasks load: the five tabs with their count chips, then search, Filter, Add time and
 * Assign task. No tab is marked: the active one is only known once the filter has loaded.
 */
const TaskFilterSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={cn('relative z-10 w-full', className)} aria-hidden="true">
			<div className="flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-2">
				<div className="flex min-w-0 items-end gap-5 max-md:order-last max-md:w-full">
					{FILTER_TAB_LABEL_WIDTHS.map((width) => (
						<div key={width} className="flex h-10 shrink-0 items-center gap-1.5 pb-1">
							<div className={cn(BAR, 'h-3', width)} />
							<div className={cn(BAR, 'h-5 w-6 rounded-sm')} />
						</div>
					))}
				</div>
				<div className="flex shrink-0 items-center gap-x-2 pb-2">
					<ToolbarPills widths={['w-8']} />
					<span className="h-4 w-px bg-border" />
					<ToolbarPills widths={FILTER_ACTION_WIDTHS} />
				</div>
			</div>
		</div>
	);
};

/**
 * Pixel-perfect skeleton for UserTeamActivity component
 * Matches the exact structure: HorizontalSeparator + Title + Activity Card + Tabs + Content
 */
export const UserTeamActivitySkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			<div className="flex flex-col justify-center w-full gap-y-4">
				{/* HorizontalSeparator skeleton */}
				<div className="h-px my-4 bg-border"></div>

				{/* Title skeleton */}
				<div className="py-2">
					<div className="w-48 bg-foreground/10 rounded-md h-7 animate-pulse"></div>
				</div>

				<div className="flex flex-col justify-between w-full overflow-hidden gap-y-5">
					{/* Activity percentage card skeleton */}
					<div className="flex items-center w-full gap-3">
						<div className="basis-1/4 min-w-56 max-w-80 rounded-xl p-4 h-32 bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 animate-pulse">
							{/* TIME_ACTIVITY label */}
							<div className="w-24 h-4 mb-3 bg-foreground/10 rounded-md"></div>
							{/* Percentage value */}
							<div className="w-20 mb-3 bg-foreground/10 rounded-md h-9"></div>
							{/* Progress bar */}
							<div className="w-4/5 h-2 bg-foreground/10 rounded-full">
								<div className="w-1/3 h-2 bg-foreground/15 rounded-full"></div>
							</div>
						</div>
					</div>

					{/* Tabs section skeleton */}
					<div className="flex-1 w-full overflow-hidden">
						{/* Tab list skeleton */}
						<div className="w-full flex gap-6 hairline-b border-border">
							{/* 4 tabs: Tasks, Screenshots, Apps, Visited Sites */}
							{Array.from({ length: 4 }).map((_, index) => {
								const isFirstTab = index === 0;
								return (
									<div key={index} className="relative pt-2 pb-3 animate-pulse">
										<div
											className={cn(
												'h-4 rounded-md bg-foreground/10',
												isFirstTab && 'w-12',
												!isFirstTab && 'w-16'
											)}
										></div>
										{isFirstTab && (
											<div className="absolute inset-x-0 bottom-0 h-0.75 rounded-t-full bg-foreground/15" />
										)}
									</div>
								);
							})}
						</div>

						{/* Tab content skeleton */}
						<div className="w-full mt-2">
							<div className="w-full overflow-hidden">
								{/* Tasks tab content skeleton - matches UserWorkedTaskTab structure */}
								<div className="flex flex-col gap-4 p-4">
									{/* Active task skeleton */}
									<div className="animate-pulse">
										<div className="flex items-center p-4 space-x-4 bg-card rounded-xl hairline-ring ring-border shadow-sm shadow-black/6.5">
											<div className="w-10 h-10 bg-foreground/10 rounded-full"></div>
											<div className="flex-1 space-y-2">
												<div className="w-3/4 h-4 bg-foreground/10 rounded-md"></div>
												<div className="w-1/2 h-3 bg-foreground/10 rounded-md"></div>
											</div>
											<div className="flex space-x-2">
												<div className="w-16 h-6 bg-foreground/10 rounded-md"></div>
												<div className="w-20 h-6 bg-foreground/10 rounded-md"></div>
											</div>
										</div>
									</div>

									{/* Other tasks skeleton */}
									{Array.from({ length: 3 }).map((_, index) => (
										<div key={index} className="animate-pulse">
											<div className="flex items-center p-4 space-x-4 bg-card rounded-xl hairline-ring ring-border shadow-sm shadow-black/6.5">
												<div className="w-10 h-10 bg-foreground/10 rounded-full"></div>
												<div className="flex-1 space-y-2">
													<div className="w-2/3 h-4 bg-foreground/10 rounded-md"></div>
													<div className="w-1/3 h-3 bg-foreground/10 rounded-md"></div>
												</div>
												<div className="flex space-x-2">
													<div className="w-12 h-6 bg-foreground/10 rounded-md"></div>
													<div className="w-16 h-6 bg-foreground/10 rounded-md"></div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default {
	UserProfileDetailSkeleton,
	UserProfileTaskSkeleton,
	TaskCardSkeleton,
	AppsTabSkeleton,
	VisitedSitesTabSkeleton,
	ScreenshootTabSkeleton,
	TaskFilterSkeleton,
	UserTeamActivitySkeleton
};
