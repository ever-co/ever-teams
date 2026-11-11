'use client';

import {
	memo,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent
} from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
	attachClosestEdge,
	extractClosestEdge,
	type Edge
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { cn } from '@/core/lib/helpers';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { getTaskEstimation } from '@/core/lib/utils/task.utils';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { TaskPropertyIcon, type TaskPropertyKind } from '@/core/components/tasks/task-property-icon';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useKanbanBoardContext, useKanbanSelection, type KanbanSelection } from './kanban-board-context';
import { Check } from '@/core/components/icons';
import { chordOfEvent, isTypingTarget, matchListKey, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';
import { isShortcutSequencePending } from '@/core/hooks/keyboard/use-shortcuts';
import { pickerOf } from '../../teams/team/tasks/list/team-task-picker-commands';
import { useTaskWorkedSeconds } from '@/core/hooks/tasks/use-task-worked-seconds';
import {
	IDLE_DRAG_STATE,
	cardData,
	dropEdgeOf,
	idleUnlessDragging,
	isCardData,
	overEdge,
	type DragOverState
} from './kanban-dnd';
import { AvatarStack, personFromTaskMember } from '@/core/components/teams/people-avatars';
import { KanbanTaskMenu } from './kanban-task-menu';
import { KanbanTaskTitleEditor } from './kanban-task-title-editor';
import { isPlainClick } from '@/core/components/tasks/drawer/task-drawer-link';

const VISIBLE_LABEL_COUNT = 2;

/**
 * Off-screen cards of a long lane skip layout and paint until scrolled into view, the DOM staying whole for drag and
 * drop. Set on the card itself: its own outline and shadow are not clipped by the containment, as a wrapper's would be.
 */
const CARD_SURFACE =
	'[content-visibility:auto] [contain-intrinsic-size:auto_128px] group/card relative flex cursor-grab flex-col gap-2.5 rounded-xl bg-card p-3 text-card-foreground hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[box-shadow,opacity] active:cursor-grabbing';

/** The card being tracked right now: a primary hairline and a soft shadow of the same hue, as the own member card. */
const LIVE_CARD = 'ring-primary/45 shadow-[0_2px_10px_-2px_hsl(var(--primary)/0.22)]';

const PROPERTY_CHIP =
	'chip-3d inline-flex h-5 max-w-36 shrink-0 items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-medium capitalize [&_[data-slot=task-property-icon]]:size-3';

const MUTED_CHIP =
	'inline-flex h-5 shrink-0 items-center rounded-[5px] bg-foreground/5 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground';

const DROP_LINE_POSITION: Record<Edge, string> = {
	top: '-top-[5px]',
	bottom: '-bottom-[5px]',
	left: '-left-[5px]',
	right: '-right-[5px]'
};

function PropertyChip({
	kind,
	name,
	color
}: Readonly<{ kind: TaskPropertyKind; name: string; color: string | null | undefined }>) {
	const isPainted = isPaintableColor(color);
	let style;
	if (isPainted) {
		style = dataColorChipStyle(color);
	}
	return (
		<span className={cn(PROPERTY_CHIP, !isPainted && '[--chip:hsl(var(--muted-foreground))]')} style={style}>
			<TaskPropertyIcon kind={kind} name={name} color={color} />
			<span className="truncate">{name.split('-').join(' ')}</span>
		</span>
	);
}

function TaskProperties({ task, hasCheck }: Readonly<{ task: TTask; hasCheck: boolean }>) {
	const { priorityItems, sizeItems } = useKanbanBoardContext();
	const priority = task.priority as string | null | undefined;
	const size = task.size as string | null | undefined;
	const labels = task.tags ?? [];
	const shownLabels = labels.slice(0, VISIBLE_LABEL_COUNT);
	const hiddenLabelCount = labels.length - shownLabels.length;
	const hasHiddenLabels = hiddenLabelCount > 0;
	const hasProperties = [Boolean(priority), Boolean(size), labels.length > 0].some(Boolean);

	if (!hasProperties) {
		return null;
	}

	return (
		<div className={cn('flex min-w-0 flex-wrap items-center gap-1', hasCheck ? 'pr-14' : 'pr-7')}>
			{priority && <PropertyChip kind="priority" name={priority} color={priorityItems.get(priority)?.bgColor} />}
			{size && <PropertyChip kind="size" name={size} color={sizeItems.get(size)?.bgColor} />}
			{shownLabels.map((label) => (
				<PropertyChip key={label.id} kind="label" name={label.name} color={label.color} />
			))}
			{hasHiddenLabels && <span className={MUTED_CHIP}>+{hiddenLabelCount}</span>}
		</div>
	);
}

function TaskProgress({ task, workedSeconds }: Readonly<{ task: TTask; workedSeconds: number }>) {
	const estimate = task.estimate ?? 0;
	if (estimate <= 0) {
		return null;
	}
	const progress = getTaskEstimation(null, task, workedSeconds, estimate);
	const isDone = progress >= 100;
	return (
		<div className="flex items-center gap-2">
			<span className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
				<span
					className={cn('block h-full rounded-full', isDone && 'bg-success', !isDone && 'bg-primary')}
					style={{ width: `${progress}%` }}
				/>
			</span>
			<span className="w-8 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
				{progress}%
			</span>
		</div>
	);
}

function WorkedTime({ seconds, isLive }: Readonly<{ seconds: number; isLive: boolean }>) {
	const t = useTranslations();
	const { hours, minutes } = secondsToTime(seconds);
	if (isLive) {
		return (
			<span className="flex items-center gap-1.5 text-xs font-medium text-success-foreground">
				<span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
				{t('common.LIVE')}
				<span className="tabular-nums text-foreground">
					{hours}h {minutes}m
				</span>
			</span>
		);
	}
	return (
		<span className="flex items-baseline gap-1.5 whitespace-nowrap">
			<span className="text-xs text-muted-foreground">{t('common.WORKED')}</span>
			<span className="text-[13px] font-medium tabular-nums text-foreground">
				{hours}h {minutes}m
			</span>
		</span>
	);
}

/** Clicks on the card's own controls (menu, links, fields) are theirs; anywhere else opens the drawer. */
function isOnControl(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	const control = target.closest('button, a, input, textarea, [role="menu"], [role="menuitem"]');
	return Boolean(control);
}

/**
 * The task list's key a press on a focused card is, by the bindings in force: `X` (with Shift, a range) or a picker's
 * (`S` `P` `L` `D` `M`). Nothing while a registry sequence waits for its second key (`G`, then `X` if so bound).
 */
function cardKeyOf(event: ReactKeyboardEvent<HTMLElement>, selection: KanbanSelection) {
	if (isShortcutSequencePending() || isTypingTarget(event.target)) {
		return null;
	}
	const chord = chordOfEvent(event.nativeEvent);
	return chord ? matchListKey(chord, SHORTCUT_COMMANDS, selection.bindings) : null;
}

const SELECT_CHECK =
	'absolute top-2 right-9 z-10 flex size-5 items-center justify-center rounded-full outline-none transition-opacity hairline-ring focus-visible:ring-[3px] focus-visible:ring-ring/25';

function SelectCheck({
	task,
	selection,
	isSelected
}: Readonly<{ task: TTask; selection: KanbanSelection; isSelected: boolean }>) {
	const t = useTranslations();
	const isSelecting = selection.selectedIds.size > 0;
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={isSelected}
			aria-label={t('pages.kanban.SELECT_TASK', { title: task.title })}
			onClick={(event) => selection.toggleSelected(task.id, event.shiftKey)}
			className={cn(
				SELECT_CHECK,
				isSelected && 'bg-primary text-primary-foreground ring-primary',
				!isSelected && 'bg-card ring-border',
				!isSelected &&
					!isSelecting &&
					'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
			)}
		>
			{isSelected && <Check className="size-3" aria-hidden="true" />}
		</button>
	);
}

function TaskTitle({ task, onOpen }: Readonly<{ task: TTask; onOpen: () => void }>) {
	const number = task.taskNumber ?? task.number;
	const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
		if (!isPlainClick(event.nativeEvent)) {
			return;
		}
		event.preventDefault();
		onOpen();
	};
	return (
		<Link
			href={`/task/${task.id}`}
			onClick={handleClick}
			draggable={false}
			className="line-clamp-2 rounded-sm text-[13px] font-medium leading-5 text-foreground outline-none hover:underline hover:decoration-foreground/30 hover:underline-offset-2 focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{task.issueType && (
				<TaskPropertyIcon kind="issueType" name={task.issueType} className="mr-1.5 inline-flex align-[-3px]" />
			)}
			{number && <span className="mr-1 font-normal tabular-nums text-muted-foreground">#{number}</span>}
			{task.title}
		</Link>
	);
}

function useCardDragAndDrop(taskId: string, statusId: string, index: number, isDragEnabled: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const [dragState, setDragState] = useState<DragOverState>(IDLE_DRAG_STATE);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}
		return combine(
			draggable({
				element,
				canDrag: () => isDragEnabled,
				getInitialData: () => cardData(taskId, statusId, index),
				onDragStart: () => setDragState({ type: 'dragging' }),
				onDrop: () => setDragState(IDLE_DRAG_STATE)
			}),
			dropTargetForElements({
				element,
				canDrop: ({ source }) => isCardData(source.data),
				getIsSticky: () => true,
				getData: ({ input }) =>
					attachClosestEdge(cardData(taskId, statusId, index), {
						element,
						input,
						allowedEdges: ['top', 'bottom']
					}),
				onDragEnter: ({ self, source }) => {
					const isSelf = source.element === element;
					if (isSelf) {
						return;
					}
					setDragState(overEdge(extractClosestEdge(self.data)));
				},
				onDrag: ({ self, source }) => {
					const isSelf = source.element === element;
					if (isSelf) {
						return;
					}
					const edge = extractClosestEdge(self.data);
					setDragState((current) => {
						const isSameEdge = dropEdgeOf(current) === edge;
						if (isSameEdge) {
							return current;
						}
						return overEdge(edge);
					});
				},
				onDragLeave: () => setDragState(idleUnlessDragging),
				onDrop: () => setDragState(IDLE_DRAG_STATE)
			})
		);
	}, [taskId, statusId, index, isDragEnabled]);

	return { ref, dragState };
}

/**
 * One task of a lane. Light by design: it reads the board context and its own task, opens no query, and mounts its
 * menu only while open, so a lane of a hundred tasks stays fast.
 */
export const KanbanTaskCard = memo(function KanbanTaskCard({
	task,
	statusId,
	index
}: Readonly<{ task: TTask; statusId: string; index: number }>) {
	const { liveTaskId, openTask } = useKanbanBoardContext();
	const selection = useKanbanSelection();
	const isSelected = Boolean(selection?.selectedIds.has(task.id));
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const { ref, dragState } = useCardDragAndDrop(task.id, statusId, index, !isEditingTitle);

	const workedSeconds = useTaskWorkedSeconds(task.id);
	const isLive = liveTaskId === task.id;
	const isDragging = dragState.type === 'dragging';
	const dropEdge = dropEdgeOf(dragState);
	const people = (task.members ?? []).map(personFromTaskMember);

	const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
		if (isEditingTitle) {
			return;
		}
		if (isOnControl(event.target)) {
			return;
		}
		// ⌘/Ctrl-click or Shift-click selects, where the board has a selection (the saved-views feature).
		const selects = [event.metaKey, event.ctrlKey, event.shiftKey].some(Boolean);
		if (selection && selects) {
			event.preventDefault();
			selection.toggleSelected(task.id, event.shiftKey);
			return;
		}
		openTask(task);
	};
	const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
		if (!selection || isEditingTitle) {
			return;
		}
		const match = cardKeyOf(event, selection);
		if (match?.commandId === 'listSelect') {
			event.preventDefault();
			selection.toggleSelected(task.id, match.extend);
			return;
		}
		const picker = match ? pickerOf(match.commandId, true) : null;
		if (!picker) {
			return;
		}
		event.preventDefault();
		const usesSelection = picker.appliesToSelection && selection.selectedIds.has(task.id);
		const taskIds = usesSelection ? [...selection.selectedIds] : [task.id];
		selection.openPicker(picker.kind, taskIds, event.currentTarget);
	};
	const hasPeople = people.length > 0;

	return (
		<div ref={ref} data-task-id={task.id} className="relative">
			<article
				className={cn(
					CARD_SURFACE,
					isLive && LIVE_CARD,
					isSelected && 'bg-primary/[0.03] ring-primary/60',
					isDragging && 'opacity-40'
				)}
				aria-label={task.title}
				onClick={handleCardClick}
				onKeyDown={handleKeyDown}
			>
				<TaskProperties task={task} hasCheck={Boolean(selection)} />
				{selection && <SelectCheck task={task} selection={selection} isSelected={isSelected} />}
				<div className="absolute top-2 right-2">
					<KanbanTaskMenu task={task} onRename={() => setIsEditingTitle(true)} />
				</div>
				{isEditingTitle && <KanbanTaskTitleEditor task={task} onDone={() => setIsEditingTitle(false)} />}
				{!isEditingTitle && <TaskTitle task={task} onOpen={() => openTask(task)} />}
				<TaskProgress task={task} workedSeconds={workedSeconds} />
				<div className="flex min-h-6 items-center justify-between gap-2 hairline-t border-dashed border-border pt-2.5">
					{hasPeople && <AvatarStack people={people} />}
					{!hasPeople && <span />}
					<WorkedTime seconds={workedSeconds} isLive={isLive} />
				</div>
			</article>
			{dropEdge && (
				<span
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary',
						DROP_LINE_POSITION[dropEdge]
					)}
				/>
			)}
		</div>
	);
});
