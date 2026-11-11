'use client';

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject
} from 'react';
import { useTranslations } from 'next-intl';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { cn } from '@/core/lib/helpers';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import { isShortcutSequencePending } from '@/core/hooks/keyboard/use-shortcuts';
import {
	bindingKeyCaps,
	chordOfEvent,
	effectiveBindings,
	matchListKey,
	SHORTCUT_COMMANDS,
	type ShortcutBinding
} from '@/core/lib/keyboard/shortcuts';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import type { TeamTasksListRow } from '@/core/lib/utils/team-tasks-view';
import { GROUP_HEIGHT, ROW_HEIGHT, TEAM_TASK_LIST_MIN_WIDTH, type TeamTasksGrid } from './team-tasks-grid';
import { TeamTasksListProvider, type TeamTaskPickerKind, type TeamTasksListActions } from './team-tasks-list-context';
import { TeamTaskRow } from './team-task-row';
import { TeamTasksBoard } from './team-tasks-board';
import { cellAppliesToSelection, pickerOf } from './team-task-picker-commands';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { TeamTasksGroupHeader } from './team-tasks-group-header';
import { TeamTasksColumnHeader } from './team-tasks-column-header';
import type { TeamTaskMenuAnchor } from './team-task-menu';

const OVERSCAN = 10;

/** The list's keys with the saved-views feature off: the defaults, as they always were. */
const DEFAULT_BINDINGS = effectiveBindings(SHORTCUT_COMMANDS, null);

/** The key cap a picker shows for the binding that opened it (`S`, `⇧S`, `Alt+S`). */
function keyCapOf(binding: ShortcutBinding | null | undefined, isMac: boolean) {
	if (binding?.length !== 1) {
		return undefined;
	}
	const [caps] = bindingKeyCaps(binding, isMac);
	if (isMac) {
		return caps.join('');
	}
	return caps.join('+');
}

export interface TeamTasksListCommands {
	openTask: (taskId: string) => void;
	openPicker: (kind: TeamTaskPickerKind, taskIds: string[], anchor: Element, shortcut?: string) => void;
	openMenu: (taskId: string, anchor: TeamTaskMenuAnchor) => void;
	createTaskInGroup: (statusName: string | null) => void;
}

function rowSizeOf(row: TeamTasksListRow | undefined) {
	if (row?.kind === 'group') {
		return GROUP_HEIGHT;
	}
	return ROW_HEIGHT;
}

function lastStickyIndexAtOrBefore(stickyIndexes: number[], index: number) {
	let found = -1;
	for (const stickyIndex of stickyIndexes) {
		if (stickyIndex > index) {
			break;
		}
		found = stickyIndex;
	}
	return found;
}

function stepOf(isDown: boolean) {
	if (isDown) {
		return 1;
	}
	return -1;
}

function rowElementOf(container: HTMLElement | null, taskId: string) {
	if (!container) {
		return null;
	}
	const escapedId = CSS.escape(taskId);
	return container.querySelector<HTMLElement>(`[data-task-id="${escapedId}"]`);
}

/** The cell a picker opens against; the row itself when that column is hidden at this width. */
export function cellAnchorOf(container: HTMLElement | null, taskId: string, kind: TeamTaskPickerKind) {
	const row = rowElementOf(container, taskId);
	if (!row) {
		return null;
	}
	const cell = row.querySelector<HTMLElement>(`[data-cell="${kind}"]`);
	const isCellShown = Boolean(cell) && cell?.offsetParent !== null;
	if (isCellShown) {
		return cell as HTMLElement;
	}
	return row;
}

function pointAnchor(x: number, y: number): TeamTaskMenuAnchor {
	return {
		getBoundingClientRect: () => new DOMRect(x, y, 0, 0)
	};
}

function selectionStateOf(orderedIds: string[], selectedIds: ReadonlySet<string>) {
	const hasTasks = orderedIds.length > 0;
	const isAll = hasTasks && selectedIds.size === orderedIds.length;
	if (isAll) {
		return true;
	}
	if (selectedIds.size > 0) {
		return 'indeterminate' as const;
	}
	return false;
}

function stickyStyleOf(): CSSProperties {
	return { position: 'sticky', zIndex: 10 };
}

function placedStyleOf(start: number, listOffset: number): CSSProperties {
	const top = start - listOffset;
	return { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${top}px)` };
}

/**
 * Where the rows start inside the scroll area: under the column labels on wide screens, at the top on phones,
 * where the labels are hidden. Read again whenever the content box changes size.
 */
function useListOffset() {
	const contentRef = useRef<HTMLDivElement>(null);
	const rowGroupRef = useRef<HTMLDivElement>(null);
	const [listOffset, setListOffset] = useState(0);
	useEffect(() => {
		const content = contentRef.current;
		if (!content) {
			return;
		}
		const observer = new ResizeObserver(() => {
			const offset = rowGroupRef.current?.offsetTop ?? 0;
			setListOffset(offset);
		});
		observer.observe(content);
		return () => observer.disconnect();
	}, []);
	return { contentRef, rowGroupRef, listOffset };
}

/**
 * The virtual list of the page: only the rows in view (and a few around) exist in the DOM, so a team with
 * thousands of tasks scrolls as lightly as one with ten. The band of the group being read stays under the column
 * labels. The keyboard walks the rows (a roving focus), and a right click opens the row's action menu.
 */
interface TeamTasksListProps {
	view: TeamTasksViewState;
	grid: TeamTasksGrid;
	commands: TeamTasksListCommands;
	scrollRef: RefObject<HTMLDivElement | null>;
}

/**
 * The tasks of the page: rows, or with the saved-views feature and a board layout, cards in one lane per status (the
 * Kanban page's board) on the same tasks, selection and commands.
 */
export function TeamTasksList(props: Readonly<TeamTasksListProps>) {
	const isBoard = props.view.settings.layout === 'board' && isTaskViewsEnabled();
	if (isBoard) {
		return <TeamTasksBoard view={props.view} commands={props.commands} />;
	}
	return <TeamTasksRows {...props} />;
}

function TeamTasksRows({ view, grid, commands, scrollRef }: Readonly<TeamTasksListProps>) {
	const t = useTranslations();
	const { rows, orderedIds, selectedIds } = view;
	const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
	const { contentRef, rowGroupRef, listOffset } = useListOffset();
	const pendingFocusRef = useRef<string | null>(null);
	const { bindings: preferredBindings, canRebind } = useKeyboardPreferences();
	const { os } = useDetectOS();
	const isMac = os === 'Mac';
	// The person's bindings with the saved-views feature on (letters by their physical key, as the registry reads
	// them); without it, the keys the list always had, by the character typed.
	const bindings = canRebind ? preferredBindings : DEFAULT_BINDINGS;

	const stickyIndexes = useMemo(() => {
		const indexes: number[] = [];
		rows.forEach((row, index) => {
			if (row.kind === 'group') {
				indexes.push(index);
			}
		});
		return indexes;
	}, [rows]);

	const rowIndexByTaskId = useMemo(() => {
		const indexes = new Map<string, number>();
		rows.forEach((row, index) => {
			const isFirstOfTask = row.kind === 'task' && !indexes.has(row.task.id);
			if (isFirstOfTask) {
				indexes.set(row.task.id, index);
			}
		});
		return indexes;
	}, [rows]);

	const rangeExtractor = useCallback(
		(range: Range) => {
			const activeIndex = lastStickyIndexAtOrBefore(stickyIndexes, range.startIndex);
			const indexes = new Set(defaultRangeExtractor(range));
			if (activeIndex >= 0) {
				indexes.add(activeIndex);
			}
			return [...indexes].sort((first, second) => first - second);
		},
		[stickyIndexes]
	);
	const getItemKey = useCallback((index: number) => rows[index]?.key ?? index, [rows]);
	const estimateSize = useCallback((index: number) => rowSizeOf(rows[index]), [rows]);

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize,
		getItemKey,
		overscan: OVERSCAN,
		rangeExtractor,
		scrollMargin: listOffset,
		scrollPaddingStart: GROUP_HEIGHT
	});

	const focusTask = useCallback((taskId: string) => {
		setFocusedTaskId((current) => {
			if (current === taskId) {
				return current;
			}
			return taskId;
		});
	}, []);

	const moveFocus = useCallback(
		(fromTaskId: string, step: number) => {
			const position = orderedIds.indexOf(fromTaskId);
			const nextPosition = Math.min(Math.max(position + step, 0), orderedIds.length - 1);
			const nextId = orderedIds[nextPosition];
			if (!nextId) {
				return null;
			}
			const rowIndex = rowIndexByTaskId.get(nextId);
			if (rowIndex !== undefined) {
				virtualizer.scrollToIndex(rowIndex, { align: 'auto' });
			}
			pendingFocusRef.current = nextId;
			setFocusedTaskId(nextId);
			return nextId;
		},
		[orderedIds, rowIndexByTaskId, virtualizer]
	);

	useEffect(() => {
		const pendingId = pendingFocusRef.current;
		if (!pendingId) {
			return;
		}
		const frame = window.requestAnimationFrame(() => {
			const element = rowElementOf(scrollRef.current, pendingId);
			element?.focus({ preventScroll: true });
			pendingFocusRef.current = null;
		});
		return () => window.cancelAnimationFrame(frame);
	}, [focusedTaskId, scrollRef]);

	const targetIdsFor = useCallback(
		(taskId: string, appliesToSelection: boolean) => {
			const isInSelection = selectedIds.has(taskId);
			const usesSelection = appliesToSelection && isInSelection;
			if (usesSelection) {
				return [...selectedIds];
			}
			return [taskId];
		},
		[selectedIds]
	);

	const openPickerFromKey = useCallback(
		(taskId: string, commandId: string) => {
			const picker = pickerOf(commandId, canRebind);
			if (!picker) {
				return;
			}
			const anchor = cellAnchorOf(scrollRef.current, taskId, picker.kind);
			if (!anchor) {
				return;
			}
			const taskIds = targetIdsFor(taskId, picker.appliesToSelection);
			commands.openPicker(picker.kind, taskIds, anchor, keyCapOf(bindings.get(commandId), isMac));
		},
		[bindings, canRebind, commands, isMac, scrollRef, targetIdsFor]
	);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		const taskId = target.dataset.taskId;
		if (!taskId) {
			return;
		}
		// The second key of a sequence (`G`, then `O`) is the registry's, not the row's.
		if (isShortcutSequencePending()) {
			return;
		}
		const chord = chordOfEvent(event, canRebind);
		if (!chord) {
			return;
		}
		const match = matchListKey(chord, SHORTCUT_COMMANDS, bindings);
		if (!match) {
			return;
		}
		const isDown = match.commandId === 'listDown';
		if (isDown || match.commandId === 'listUp') {
			event.preventDefault();
			const step = stepOf(isDown);
			const nextId = moveFocus(taskId, step);
			const extendsSelection = match.extend && Boolean(nextId);
			if (extendsSelection) {
				view.setManySelected([taskId, nextId as string], true);
			}
			return;
		}
		if (match.commandId === 'listOpen') {
			event.preventDefault();
			commands.openTask(taskId);
			return;
		}
		if (match.commandId === 'listSelect') {
			event.preventDefault();
			view.toggleSelected(taskId, match.extend);
			return;
		}
		if (match.commandId === 'listClear') {
			view.clearSelection();
			return;
		}
		if (pickerOf(match.commandId, canRebind)) {
			event.preventDefault();
			openPickerFromKey(taskId, match.commandId);
		}
	};

	const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
		const target = event.target as Element;
		const row = target.closest<HTMLElement>('[data-task-id]');
		const taskId = row?.dataset.taskId;
		if (!row || !taskId) {
			return;
		}
		event.preventDefault();
		const isFromKeyboard = event.clientX === 0 && event.clientY === 0;
		let anchor: TeamTaskMenuAnchor = pointAnchor(event.clientX, event.clientY);
		if (isFromKeyboard) {
			anchor = row;
		}
		setFocusedTaskId(taskId);
		commands.openMenu(taskId, anchor);
	};

	const actions = useMemo<TeamTasksListActions>(
		() => ({
			openTask: commands.openTask,
			openPicker: (kind, taskIds, anchor) => {
				const appliesToSelection = cellAppliesToSelection(kind, canRebind);
				const firstId = taskIds[0];
				const ids = targetIdsFor(firstId, appliesToSelection);
				commands.openPicker(kind, ids, anchor);
			},
			openRowMenu: (taskId, anchor) => commands.openMenu(taskId, anchor),
			toggleSelected: view.toggleSelected,
			setManySelected: view.setManySelected,
			toggleGroup: view.toggleGroup,
			createTaskInGroup: commands.createTaskInGroup,
			focusTask
		}),
		[canRebind, commands, focusTask, targetIdsFor, view.setManySelected, view.toggleGroup, view.toggleSelected]
	);

	const isSelecting = selectedIds.size > 0;
	const tabStopId = focusedTaskId ?? orderedIds[0] ?? null;
	const headerSelection = selectionStateOf(orderedIds, selectedIds);
	const handleSelectAll = (isSelected: boolean) => {
		if (isSelected) {
			view.setManySelected(orderedIds, true);
			return;
		}
		view.clearSelection();
	};
	const handleOrder = (ordering: TeamTasksViewState['settings']['ordering']) => {
		const isSameOrdering = view.settings.ordering === ordering;
		if (isSameOrdering) {
			view.toggleDirection();
			return;
		}
		view.setOrdering(ordering);
	};

	const items = virtualizer.getVirtualItems();
	const firstVisibleIndex = virtualizer.range?.startIndex ?? 0;
	const activeStickyIndex = lastStickyIndexAtOrBefore(stickyIndexes, firstVisibleIndex);

	return (
		<TeamTasksListProvider
			grid={grid}
			properties={view.settings.properties}
			statuses={view.statuses}
			projectNames={view.lookups.projectNames}
			memberNames={view.lookups.memberNames}
			tasks={view.tasks}
			taskById={view.taskById}
			childCounts={view.childCounts}
			actions={actions}
		>
			<div
				ref={scrollRef}
				role="grid"
				tabIndex={-1}
				aria-label={t('sidebar.TEAMTASKS')}
				aria-rowcount={rows.length}
				aria-multiselectable={true}
				onKeyDown={handleKeyDown}
				onContextMenu={handleContextMenu}
				className="relative h-full overflow-auto overscroll-contain custom-scrollbar"
			>
				<div ref={contentRef} style={grid.style} className={cn('min-w-full', TEAM_TASK_LIST_MIN_WIDTH)}>
					<TeamTasksColumnHeader
						grid={grid}
						ordering={view.settings.ordering}
						isDescending={view.settings.isDescending}
						onOrder={handleOrder}
						selectionState={headerSelection}
						onSelectAll={handleSelectAll}
					/>
					<div
						ref={rowGroupRef}
						role="rowgroup"
						className="relative"
						style={{ height: virtualizer.getTotalSize() }}
					>
						{items.map((item) => {
							const row = rows[item.index];
							if (!row) {
								return null;
							}
							const isActiveSticky = row.kind === 'group' && item.index === activeStickyIndex;
							let style = placedStyleOf(item.start, listOffset);
							if (isActiveSticky) {
								style = stickyStyleOf();
							}
							if (row.kind === 'group') {
								return (
									<div
										key={item.key}
										style={style}
										data-index={item.index}
										className={cn(isActiveSticky && 'top-0 lg:top-9')}
									>
										<TeamTasksGroupHeader
											group={row.group}
											isCollapsed={row.isCollapsed}
											selectedIds={selectedIds}
										/>
									</div>
								);
							}
							return (
								<div key={item.key} style={style} data-index={item.index}>
									<TeamTaskRow
										task={row.task}
										isSelected={selectedIds.has(row.task.id)}
										isFocused={focusedTaskId === row.task.id}
										isTabStop={tabStopId === row.task.id}
										isSelecting={isSelecting}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</TeamTasksListProvider>
	);
}
