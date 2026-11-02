'use client';

import { memo, RefObject, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
	attachClosestEdge,
	extractClosestEdge,
	type Edge
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronLeft, MoreHorizontal, Pencil, Plus } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { cn } from '@/core/lib/helpers';
import type { KanbanLane as KanbanLaneModel } from '@/core/lib/utils/kanban-board';
import type { TTaskStatus } from '@/core/types/schemas';
import { useKanbanBoardContext } from './kanban-board-context';
import {
	IDLE_DRAG_STATE,
	dropEdgeOf,
	idleUnlessDragging,
	isCardData,
	isLaneData,
	laneBodyData,
	laneData,
	overEdge,
	type DragOverState
} from './kanban-dnd';
import { KanbanTaskCard } from './kanban-task-card';
import { LANE_SURFACE, LANE_WIDTH } from './kanban-recipes';

const COUNT_CHIP = 'rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

const LANE_DROP_LINE: Record<Edge, string> = {
	left: '-left-[7px]',
	right: '-right-[7px]',
	top: '-top-[7px]',
	bottom: '-bottom-[7px]'
};

export function statusLabelOf(status: TTaskStatus) {
	const name = status.name ?? '';
	return name.split('-').join(' ');
}

export function KanbanStatusTile({ status, className }: Readonly<{ status: TTaskStatus; className?: string }>) {
	const isPainted = isPaintableColor(status.color);
	let style;
	if (isPainted) {
		style = dataColorChipStyle(status.color as string);
	}
	return (
		<span
			className={cn(
				'chip-3d flex size-5 shrink-0 items-center justify-center rounded-md [&_[data-slot=task-property-icon]]:size-3.5',
				!isPainted && '[--chip:hsl(var(--muted-foreground))]',
				className
			)}
			style={style}
		>
			<TaskPropertyIcon kind="status" name={status.name} color={status.color} />
		</span>
	);
}

function LaneMenu({ status }: Readonly<{ status: TTaskStatus }>) {
	const t = useTranslations();
	const { createTaskIn, editStatus, setLaneCollapsed } = useKanbanBoardContext();
	const { canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	// Collapsing a column and editing its status both save on the status, for the whole team
	const isStatusReadOnly = !canWriteRow(status);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className="size-6 text-muted-foreground"
					aria-label={t('common.MORE_OPTIONS')}
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuItem onClick={() => createTaskIn(status)}>
					<Plus />
					{t('common.CREATE_TASK')}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{isStatusReadOnly && (
					<DropdownMenuLabel className="font-normal text-pretty">{readOnlyHint}</DropdownMenuLabel>
				)}
				<DropdownMenuItem disabled={isStatusReadOnly} onClick={() => setLaneCollapsed(status, true)}>
					<ChevronLeft />
					{t('common.COLLAPSE_COLUMN')}
				</DropdownMenuItem>
				<DropdownMenuItem disabled={isStatusReadOnly} onClick={() => editStatus(status)}>
					<Pencil />
					{t('common.EDIT_STATUS')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LaneHeader({
	status,
	taskCount,
	handleRef
}: Readonly<{ status: TTaskStatus; taskCount: number; handleRef: RefObject<HTMLDivElement | null> }>) {
	const t = useTranslations();
	const { createTaskIn } = useKanbanBoardContext();
	return (
		<div className="flex h-11 shrink-0 items-center gap-2 pr-1.5 pl-3">
			<div ref={handleRef} className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing">
				<KanbanStatusTile status={status} />
				<h2 className="truncate text-[13px] font-semibold capitalize text-foreground">
					{statusLabelOf(status)}
				</h2>
				<span className={COUNT_CHIP}>{taskCount}</span>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				className="size-6 text-muted-foreground"
				aria-label={t('common.CREATE_TASK')}
				onClick={() => createTaskIn(status)}
			>
				<Plus className="size-4" />
			</Button>
			<LaneMenu status={status} />
		</div>
	);
}

function CreateTaskRow({ status }: Readonly<{ status: TTaskStatus }>) {
	const t = useTranslations();
	const { createTaskIn } = useKanbanBoardContext();
	return (
		<button
			type="button"
			onClick={() => createTaskIn(status)}
			className="flex h-8 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 outline-none"
		>
			<Plus className="size-4" />
			{t('common.CREATE_TASK')}
		</button>
	);
}

function LaneCards({ lane }: Readonly<{ lane: KanbanLaneModel }>) {
	return (
		<div className="flex flex-col gap-2">
			{lane.tasks.map((task, index) => (
				<KanbanTaskCard key={task.id} task={task} statusId={lane.status.id} index={index} />
			))}
		</div>
	);
}

function useLaneDragAndDrop(statusId: string, index: number) {
	const laneRef = useRef<HTMLElement>(null);
	const handleRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [laneState, setLaneState] = useState<DragOverState>(IDLE_DRAG_STATE);
	const [isCardOver, setIsCardOver] = useState(false);

	useEffect(() => {
		const lane = laneRef.current;
		const handle = handleRef.current;
		const body = bodyRef.current;
		if (!lane || !handle || !body) {
			return;
		}
		return combine(
			draggable({
				element: lane,
				dragHandle: handle,
				getInitialData: () => laneData(statusId, index),
				onDragStart: () => setLaneState({ type: 'dragging' }),
				onDrop: () => setLaneState(IDLE_DRAG_STATE)
			}),
			dropTargetForElements({
				element: lane,
				canDrop: ({ source }) => isLaneData(source.data),
				getIsSticky: () => true,
				getData: ({ input }) =>
					attachClosestEdge(laneData(statusId, index), {
						element: lane,
						input,
						allowedEdges: ['left', 'right']
					}),
				onDrag: ({ self, source }) => {
					const isSelf = source.element === lane;
					if (isSelf) {
						return;
					}
					setLaneState(overEdge(extractClosestEdge(self.data)));
				},
				onDragLeave: () => setLaneState(idleUnlessDragging),
				onDrop: () => setLaneState(IDLE_DRAG_STATE)
			}),
			dropTargetForElements({
				element: body,
				canDrop: ({ source }) => isCardData(source.data),
				getData: () => laneBodyData(statusId),
				onDragEnter: () => setIsCardOver(true),
				onDragLeave: () => setIsCardOver(false),
				onDrop: () => setIsCardOver(false)
			}),
			autoScrollForElements({ element: body })
		);
	}, [statusId, index]);

	return { laneRef, handleRef, bodyRef, laneState, isCardOver };
}

/**
 * One status of the board: a tinted lane whose header drags the lane and whose body scrolls on its own and takes
 * the cards dropped on it.
 */
export const KanbanLane = memo(function KanbanLane({
	lane,
	index
}: Readonly<{ lane: KanbanLaneModel; index: number }>) {
	const { laneRef, handleRef, bodyRef, laneState, isCardOver } = useLaneDragAndDrop(lane.status.id, index);
	const isDragging = laneState.type === 'dragging';
	const dropEdge = dropEdgeOf(laneState);

	return (
		<section
			ref={laneRef}
			aria-label={statusLabelOf(lane.status)}
			className={cn(
				'relative flex h-full shrink-0 flex-col rounded-xl transition-[background-color,box-shadow,opacity]',
				LANE_WIDTH,
				LANE_SURFACE,
				isCardOver && 'bg-primary/[0.05] hairline-ring ring-primary/30',
				isDragging && 'opacity-40'
			)}
		>
			<LaneHeader status={lane.status} taskCount={lane.tasks.length} handleRef={handleRef} />
			<div
				ref={bodyRef}
				className="custom-scrollbar flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
			>
				<LaneCards lane={lane} />
				<CreateTaskRow status={lane.status} />
			</div>
			{dropEdge && (
				<span
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute inset-y-2 w-0.5 rounded-full bg-primary',
						LANE_DROP_LINE[dropEdge]
					)}
				/>
			)}
		</section>
	);
});
