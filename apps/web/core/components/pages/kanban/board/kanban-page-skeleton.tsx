'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { cn } from '@/core/lib/helpers';
import { KanbanBoardSkeleton } from './kanban-board-skeleton';

const BAR = 'block animate-pulse rounded-full bg-foreground/[0.06]';

const TEAM_AVATAR_KEYS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5'];

const VIEW_SEGMENTS = [{}, {}, {}, {}];

const KANBAN_VIEW_INDEX = 3;

const DAY_SEGMENTS = [{ labelWidth: 'w-4.5' }, { labelWidth: 'w-10' }, { labelWidth: 'w-16' }, { labelWidth: 'w-15' }];

const BOARD_CONTROL_WIDTHS = ['w-56', 'w-21', 'w-36'];

export const KANBAN_TOOLBAR_SEPARATOR = 'h-4 w-px shrink-0 bg-border';

export function KanbanTeamAvatarsSkeleton() {
	return (
		<span aria-hidden="true" className="flex items-center -space-x-1.5">
			{TEAM_AVATAR_KEYS.map((key) => (
				<span key={key} className="size-7 animate-pulse rounded-full bg-muted ring-2 ring-card" />
			))}
		</span>
	);
}

export function KanbanToolbarSkeleton() {
	const t = useTranslations();
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('pages.kanban.KANBAN_BOARD')}</h1>
					<span className={cn(BAR, 'h-2.5 w-20 self-center')} />
				</div>
				<div className="flex items-center gap-3">
					<SegmentedControlSkeleton segments={VIEW_SEGMENTS} pickedIndex={KANBAN_VIEW_INDEX} />
					<span className={KANBAN_TOOLBAR_SEPARATOR} />
					<KanbanTeamAvatarsSkeleton />
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3 pb-3">
				<SegmentedControlSkeleton segments={DAY_SEGMENTS} />
				<div className="flex flex-wrap items-center gap-2">
					<ToolbarPills widths={BOARD_CONTROL_WIDTHS} />
				</div>
			</div>
		</div>
	);
}

export function KanbanPageSkeleton() {
	return (
		<PageSkeletonFrame className="min-h-0 flex-1 p-0" toolbar={<KanbanToolbarSkeleton />}>
			<div className="absolute inset-0">
				<KanbanBoardSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
