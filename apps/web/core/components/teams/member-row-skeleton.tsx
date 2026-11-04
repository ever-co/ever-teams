import { cn } from '@/core/lib/helpers';
import { Skeleton } from '@/core/components/common/skeleton';
import { IssuesView } from '@/core/constants/config/constants';
import { DAY_GROUP_SURFACE_CLASS_NAME } from '@/core/components/tasks/daily-plan/day-group';
import {
	MEMBER_CARD,
	MEMBER_CARD_PADDING,
	MEMBER_CELL,
	MEMBER_CELL_CENTER,
	MEMBER_FIRST_CELL,
	MEMBER_GRID_COLUMNS_FROM_XL,
	MEMBER_GRID_FROM,
	MEMBER_MENU_CELL,
	MEMBER_ROW_GRID,
	MEMBER_ROW_MIN_HEIGHT,
	MEMBER_LIST_CONTAINER,
	MEMBER_STACK_UNTIL,
	MEMBER_TABLE_SURFACE
} from './member-row-grid';

const BAR = 'bg-foreground/[0.06]';

export function MemberIdentityCellSkeleton() {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<Skeleton className={cn(BAR, 'size-9 shrink-0 rounded-full')} />
			<div className="flex min-w-0 flex-col gap-1.5">
				<Skeleton className={cn(BAR, 'h-3.5 w-28')} />
				<Skeleton className={cn(BAR, 'h-3 w-36')} />
			</div>
		</div>
	);
}

/** The task title over its label strip, the two lines a loaded task shows. */
export function MemberTaskCellSkeleton() {
	return (
		<div className="flex w-full min-w-0 flex-col gap-2.5">
			<Skeleton className={cn(BAR, 'h-3.5 w-4/5')} />
			<div className="flex items-center gap-1.5">
				<Skeleton className={cn(BAR, 'h-6 w-20')} />
				<Skeleton className={cn(BAR, 'h-6 w-14')} />
				<Skeleton className={cn(BAR, 'h-6 w-16')} />
			</div>
		</div>
	);
}

/** "Today" and "Total" on two lines. */
export function MemberTimesCellSkeleton() {
	return (
		<div className="flex flex-col items-center gap-2">
			<Skeleton className={cn(BAR, 'h-3.5 w-28')} />
			<Skeleton className={cn(BAR, 'h-3.5 w-24')} />
		</div>
	);
}

/** The estimate and its progress bar. */
export function MemberEstimateCellSkeleton() {
	return (
		<div className="flex w-full max-w-52 flex-col items-center gap-2.5">
			<Skeleton className={cn(BAR, 'h-3.5 w-32')} />
			<Skeleton className={cn(BAR, 'h-1.5 w-full rounded-full')} />
		</div>
	);
}

/** The today's total pill. */
export function MemberTotalCellSkeleton() {
	return <Skeleton className={cn(BAR, 'h-7 w-24 rounded-full')} />;
}

/** A whole member row on the member grid, at the height of a loaded one, the same in the cards and table views. */
export function MemberRowSkeleton({ className }: Readonly<{ className?: string }>) {
	return (
		<output className={cn('block', className)}>
			<div className={cn(MEMBER_GRID_FROM, MEMBER_CARD_PADDING, 'py-2')}>
				<div className={cn(MEMBER_ROW_GRID, MEMBER_ROW_MIN_HEIGHT)}>
					<div className={MEMBER_FIRST_CELL}>
						<MemberIdentityCellSkeleton />
					</div>
					<div className={MEMBER_CELL}>
						<MemberTaskCellSkeleton />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<MemberTimesCellSkeleton />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<MemberEstimateCellSkeleton />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<MemberTotalCellSkeleton />
					</div>
					<div className={MEMBER_MENU_CELL} />
				</div>
			</div>
			<div className={cn(MEMBER_STACK_UNTIL, 'flex flex-col gap-3 px-3 py-3')}>
				<MemberIdentityCellSkeleton />
				<MemberTaskCellSkeleton />
			</div>
		</output>
	);
}

/** A pending invitation card: identity, then a short value in each column, at the same height as a member. */
export function InvitationRowSkeleton({ className }: Readonly<{ className?: string }>) {
	return (
		<output className={cn('block', className)}>
			<div className={cn(MEMBER_GRID_FROM, MEMBER_CARD_PADDING, 'py-2')}>
				<div className={cn(MEMBER_ROW_GRID, MEMBER_ROW_MIN_HEIGHT)}>
					<div className={MEMBER_FIRST_CELL}>
						<MemberIdentityCellSkeleton />
					</div>
					<div className={MEMBER_CELL}>
						<Skeleton className={cn(BAR, 'h-3.5 w-24')} />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<Skeleton className={cn(BAR, 'h-3.5 w-6')} />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<Skeleton className={cn(BAR, 'h-3.5 w-6')} />
					</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						<Skeleton className={cn(BAR, 'h-3.5 w-6')} />
					</div>
					<div className={MEMBER_MENU_CELL} />
				</div>
			</div>
			<div className={cn(MEMBER_STACK_UNTIL, 'px-3 py-3')}>
				<MemberIdentityCellSkeleton />
			</div>
		</output>
	);
}

const MEMBER_SKELETON_KEYS = ['member-1', 'member-2', 'member-3', 'member-4'];
const INVITATION_SKELETON_KEYS = ['invitation-1', 'invitation-2'];

/**
 * The member list while it loads, in the shape of the cards or the table view, at the height of loaded rows: the
 * table keeps one surface split by hairlines with an actions column, the cards stay separate.
 */
export function MemberListSkeleton({ view, className }: Readonly<{ view: IssuesView; className?: string }>) {
	const isTableView = view === IssuesView.TABLE;
	if (isTableView) {
		return (
			<div className={cn(MEMBER_LIST_CONTAINER, className)}>
				<div className={MEMBER_TABLE_SURFACE}>
					<ul className="hairline-divide-y divide-border">
						{MEMBER_SKELETON_KEYS.map((key) => (
							<li key={key}>
								<MemberRowSkeleton />
							</li>
						))}
					</ul>
				</div>
			</div>
		);
	}
	return (
		<div className={cn(MEMBER_LIST_CONTAINER, className)}>
			<ul className="flex flex-col gap-2">
				{MEMBER_SKELETON_KEYS.map((key) => (
					<li key={key} className={MEMBER_CARD}>
						<MemberRowSkeleton />
					</li>
				))}
				{INVITATION_SKELETON_KEYS.map((key) => (
					<li key={key} className={MEMBER_CARD}>
						<InvitationRowSkeleton />
					</li>
				))}
			</ul>
		</div>
	);
}

const ACTIVITY_SWITCH_LABELS = ['w-9', 'w-16', 'w-7', 'w-16'];
const PLAN_SWITCH_LABELS = ['w-16', 'w-16', 'w-14', 'w-14', 'w-16'];
const VIEW_SWITCH_ICON_COUNT = 3;
const PLAN_STRIP_KEYS = ['planned', 'estimated', 'worked', 'completed', 'completion'];
const PLAN_TASK_KEYS = ['task-1', 'task-2'];

const SEGMENT_TRACK = 'inline-flex items-center gap-0.5 rounded-lg bg-foreground/[0.03] p-0.5';
const SEGMENT_ITEM = 'flex h-7 items-center justify-center rounded-md px-3';
const SEGMENT_THUMB = 'bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)] hairline-ring ring-foreground/[0.06]';
const SEGMENT_LABEL = 'h-2.5 rounded-full bg-foreground/[0.07]';

function segmentItemClassName(index: number) {
	const isFirst = index === 0;
	return cn(SEGMENT_ITEM, isFirst && SEGMENT_THUMB);
}

function planTaskRowClassName(index: number) {
	const followsFiguresStrip = index === 0;
	return cn('hairline-t border-border', followsFiguresStrip && 'border-dashed');
}

/** A segmented control's light track with label-sized bars, the first option raised like the real thumb. */
function SegmentedControlSkeleton({ labelWidths }: Readonly<{ labelWidths: string[] }>) {
	return (
		<div className={SEGMENT_TRACK}>
			{labelWidths.map((width, index) => (
				<span key={`${width}-${index}`} className={segmentItemClassName(index)}>
					<span className={cn(SEGMENT_LABEL, width)} />
				</span>
			))}
		</div>
	);
}

/** An icon-only view switch: the pale track, the raised first option and one glyph slot per view. */
export function ViewSwitchSkeleton({ iconCount = VIEW_SWITCH_ICON_COUNT }: Readonly<{ iconCount?: number }>) {
	const iconKeys = Array.from({ length: iconCount }, (_, index) => index);
	return (
		<div className={SEGMENT_TRACK}>
			{iconKeys.map((key) => (
				<span key={key} className={cn(segmentItemClassName(key), 'w-7 px-0')}>
					<span className="size-3.5 rounded-[4px] bg-foreground/[0.07]" />
				</span>
			))}
		</div>
	);
}

function PlanTaskRowSkeleton() {
	return (
		<div className={cn(MEMBER_CARD_PADDING, 'py-2')}>
			<div className={cn(MEMBER_ROW_GRID, MEMBER_ROW_MIN_HEIGHT)}>
				<div className={cn(MEMBER_FIRST_CELL, 'col-span-2')}>
					<MemberTaskCellSkeleton />
				</div>
				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					<MemberTimesCellSkeleton />
				</div>
				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					<MemberEstimateCellSkeleton />
				</div>
				<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
					<Skeleton className={cn(BAR, 'h-7 w-28 rounded-full')} />
				</div>
				<div className={MEMBER_MENU_CELL} />
			</div>
		</div>
	);
}

/**
 * The panel unfolded under a member while its plans load, in the shape of the loaded panel: the activity switch, the
 * plan tabs with the view switch, then a day card with its header, its figures strip and its task rows on the member
 * grid, starting at the same distance from the row above.
 */
export function MemberActivityPanelSkeleton() {
	return (
		<output className="flex flex-col">
			<div className="pb-3 pt-4">
				<SegmentedControlSkeleton labelWidths={ACTIVITY_SWITCH_LABELS} />
			</div>
			<div className="flex items-center justify-between gap-3 pb-4">
				<SegmentedControlSkeleton labelWidths={PLAN_SWITCH_LABELS} />
				<ViewSwitchSkeleton />
			</div>
			<div className={DAY_GROUP_SURFACE_CLASS_NAME}>
				<div className="flex h-12 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<Skeleton className={cn(BAR, 'h-4 w-28')} />
						<Skeleton className={cn(BAR, 'h-5 w-6')} />
					</div>
					<Skeleton className={cn(BAR, 'size-4')} />
				</div>
				<div className={cn('flex flex-wrap hairline-t border-border', MEMBER_GRID_COLUMNS_FROM_XL)}>
					{PLAN_STRIP_KEYS.map((key) => (
						<div
							key={key}
							className="flex flex-1 flex-col gap-1.5 hairline-l border-dashed border-border px-4 py-3 first:border-l-0"
						>
							<Skeleton className={cn(BAR, 'h-3 w-20')} />
							<Skeleton className={cn(BAR, 'h-4 w-12')} />
						</div>
					))}
				</div>
				{PLAN_TASK_KEYS.map((key, index) => (
					<div key={key} className={planTaskRowClassName(index)}>
						<PlanTaskRowSkeleton />
					</div>
				))}
			</div>
		</output>
	);
}
