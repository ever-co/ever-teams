'use client';

import { Skeleton } from '@/core/components/common/skeleton';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';

const SKELETON_BAR = 'bg-foreground/[0.06]';

const PROPERTY_ROW =
	'grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]';

const PROPERTY_KEYS = ['status', 'managers', 'members', 'dates', 'teams', 'budget'];

const FIGURE_KEYS = ['scope', 'started', 'completed'];

const FACT_KEYS = ['code', 'created'];

const HEADER_ACTION_WIDTHS = ['w-20', 'w-8'];

const TAB_SEGMENTS = [
	{ labelWidth: 'w-16' },
	{ labelWidth: 'w-9', hasCount: true },
	{ labelWidth: 'w-11', hasCount: true }
];

export function ProjectDetailToolbarSkeleton() {
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<Skeleton className={cn('size-10 rounded-[11px]', SKELETON_BAR)} />
					<div className="flex flex-col gap-1.5">
						<Skeleton className={cn('h-2.5 w-20 rounded-full', SKELETON_BAR)} />
						<Skeleton className={cn('h-4 w-48 rounded-full', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ToolbarPills widths={HEADER_ACTION_WIDTHS} />
				</div>
			</div>
			<div className="pb-3">
				<SegmentedControlSkeleton segments={TAB_SEGMENTS} />
			</div>
		</div>
	);
}

export function ProjectProgressFiguresSkeleton() {
	return (
		<>
			<div className="grid grid-cols-3 gap-3">
				{FIGURE_KEYS.map((key) => (
					<Skeleton key={key} className={cn('h-10', SKELETON_BAR)} />
				))}
			</div>
			<Skeleton className={cn('h-1.5 w-full rounded-full', SKELETON_BAR)} />
		</>
	);
}

function SectionLabelSkeleton({ width }: Readonly<{ width: string }>) {
	return (
		<div className="flex h-4 items-center">
			<Skeleton className={cn('h-2.5 rounded-full', SKELETON_BAR, width)} />
		</div>
	);
}

export function ProjectDetailBodySkeleton() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10"
		>
			<div className="flex min-w-0 flex-col">
				<SectionLabelSkeleton width="w-20" />
				<div className="mt-1 flex flex-col">
					{PROPERTY_KEYS.map((key) => (
						<div key={key} className={PROPERTY_ROW}>
							<Skeleton className={cn('h-3 w-24 rounded-full', SKELETON_BAR)} />
							<Skeleton className={cn('h-6 w-36 rounded-md', SKELETON_BAR)} />
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-col self-start rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border">
				<div className="flex flex-col gap-4 p-4">
					<div className="flex flex-col gap-1.5">
						<Skeleton className={cn('h-3 w-20 rounded-full', SKELETON_BAR)} />
						<Skeleton className={cn('h-2.5 w-40 rounded-full', SKELETON_BAR)} />
					</div>
					<ProjectProgressFiguresSkeleton />
				</div>
				<div className="flex flex-col gap-3 p-4">
					<Skeleton className={cn('h-3 w-16 rounded-full', SKELETON_BAR)} />
					{FACT_KEYS.map((key) => (
						<div key={key} className="flex items-center justify-between">
							<Skeleton className={cn('h-2.5 w-16 rounded-full', SKELETON_BAR)} />
							<Skeleton className={cn('h-3 w-14 rounded-full', SKELETON_BAR)} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function ProjectDetailPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<ProjectDetailToolbarSkeleton />}>
			<ProjectDetailBodySkeleton />
		</PageSkeletonFrame>
	);
}
