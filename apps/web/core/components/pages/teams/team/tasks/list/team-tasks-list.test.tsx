/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

let mockPreferences: { bindings: ReturnType<typeof effectiveBindings>; canRebind: boolean };
let mockSequencePending = false;

jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => ({
	useKeyboardPreferences: () => ({ ...mockPreferences, overrides: {}, setOverrides: jest.fn() })
}));
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({
	isShortcutSequencePending: () => mockSequencePending
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/lib/helpers', () => ({
	cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));
// Every row is drawn: jsdom has no layout for the virtualizer to measure.
jest.mock('@tanstack/react-virtual', () => ({
	defaultRangeExtractor: () => [],
	useVirtualizer: ({ count }: { count: number }) => ({
		getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 40 })),
		getTotalSize: () => count * 40,
		scrollToIndex: jest.fn(),
		range: { startIndex: 0 }
	})
}));
jest.mock('./team-tasks-list-context', () => ({
	TeamTasksListProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('./team-task-row', () => ({
	TeamTaskRow: ({ task, isFocused }: { task: { id: string }; isFocused: boolean }) => (
		<div role="row" tabIndex={0} data-task-id={task.id} data-focused={String(isFocused)}>
			{task.id}
		</div>
	)
}));
jest.mock('./team-tasks-group-header', () => ({ TeamTasksGroupHeader: () => null }));
jest.mock('./team-tasks-column-header', () => ({ TeamTasksColumnHeader: () => null }));
jest.mock('./team-tasks-board', () => ({ TeamTasksBoard: () => <div data-testid="board" /> }));

import { TeamTasksList, type TeamTasksListCommands } from './team-tasks-list';

const DEFAULTS = effectiveBindings(SHORTCUT_COMMANDS, null);

beforeAll(() => {
	global.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
	if (typeof CSS === 'undefined' || !CSS.escape) {
		(global as unknown as { CSS: { escape: (value: string) => string } }).CSS = {
			escape: (value: string) => value
		};
	}
});

function renderList({
	canRebind,
	overrides = null,
	selected = []
}: {
	canRebind: boolean;
	overrides?: Record<string, string> | null;
	selected?: string[];
}) {
	mockPreferences = { bindings: canRebind ? effectiveBindings(SHORTCUT_COMMANDS, overrides) : DEFAULTS, canRebind };
	const ids = ['t1', 't2', 't3'];
	const view = {
		rows: ids.map((id) => ({ kind: 'task', key: id, task: { id } })),
		orderedIds: ids,
		selectedIds: new Set<string>(selected),
		settings: { properties: [], ordering: 'status', isDescending: false },
		statuses: [],
		lookups: { projectNames: new Map(), memberNames: new Map() },
		tasks: [],
		taskById: new Map(),
		childCounts: new Map(),
		setManySelected: jest.fn(),
		toggleSelected: jest.fn(),
		clearSelection: jest.fn(),
		toggleGroup: jest.fn(),
		toggleDirection: jest.fn(),
		setOrdering: jest.fn()
	};
	const commands: TeamTasksListCommands = {
		openTask: jest.fn(),
		openPicker: jest.fn(),
		openMenu: jest.fn(),
		createTaskInGroup: jest.fn()
	};
	const scrollRef = React.createRef<HTMLDivElement>();
	const utils = render(
		<TeamTasksList
			view={view as unknown as Parameters<typeof TeamTasksList>[0]['view']}
			grid={{ style: {} } as unknown as Parameters<typeof TeamTasksList>[0]['grid']}
			commands={commands}
			scrollRef={scrollRef}
		/>
	);
	const row = (id: string) => utils.container.querySelector<HTMLElement>(`[data-task-id="${id}"]`)!;
	const focused = () => utils.container.querySelector<HTMLElement>('[data-focused="true"]')?.dataset.taskId ?? null;
	return { view, commands, row, focused };
}

const key = (
	code: string,
	value: string,
	modifiers: Partial<Record<'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey', boolean>> = {}
) => ({
	code,
	key: value,
	...modifiers
});

describe('TeamTasksList keys', () => {
	beforeEach(() => {
		mockSequencePending = false;
	});

	it('with the registry off, keeps the keys it always had, by the character typed', () => {
		const { row, focused, commands, view } = renderList({ canRebind: false });
		// Dvorak: the key that prints `j` is the physical C.
		fireEvent.keyDown(row('t1'), key('KeyC', 'j'));
		expect(focused()).toBe('t2');
		fireEvent.keyDown(row('t2'), key('KeyS', 's'));
		expect(commands.openPicker).toHaveBeenCalledWith('status', ['t2'], row('t2'), 'S');
		fireEvent.keyDown(row('t2'), key('KeyX', 'x'));
		expect(view.toggleSelected).toHaveBeenCalledWith('t2', false);
		fireEvent.keyDown(row('t2'), key('KeyJ', 'j', { ctrlKey: true }));
		expect(focused()).toBe('t2');
	});

	it('runs the rebound keys, no longer the old ones; Shift on a bare binding extends the selection', () => {
		const { row, focused, view, commands } = renderList({
			canRebind: true,
			overrides: { listDown: 'b', taskStatus: 'alt+s' }
		});
		fireEvent.keyDown(row('t1'), key('KeyJ', 'j'));
		expect(focused()).toBeNull();
		fireEvent.keyDown(row('t1'), key('KeyB', 'b'));
		expect(focused()).toBe('t2');
		fireEvent.keyDown(row('t2'), key('KeyB', 'B', { shiftKey: true }));
		expect(focused()).toBe('t3');
		expect(view.setManySelected).toHaveBeenCalledWith(['t2', 't3'], true);
		// The physical key: K on a Cyrillic layout prints `л`.
		fireEvent.keyDown(row('t3'), key('KeyK', 'л'));
		expect(focused()).toBe('t2');

		fireEvent.keyDown(row('t2'), key('KeyS', 's'));
		expect(commands.openPicker).not.toHaveBeenCalled();
		fireEvent.keyDown(row('t2'), key('KeyS', 'ß', { altKey: true }));
		// The picker shows the key in force.
		expect(commands.openPicker).toHaveBeenCalledWith('status', ['t2'], row('t2'), 'Alt+S');
		fireEvent.keyDown(row('t2'), key('KeyX', 'X', { shiftKey: true }));
		expect(view.toggleSelected).toHaveBeenCalledWith('t2', true);
	});

	it('leaves the built-in keys as they are: the arrows, Enter and O, Esc', () => {
		const { row, focused, view, commands } = renderList({
			canRebind: true,
			overrides: { listDown: 'b', listUp: 'u' }
		});
		fireEvent.keyDown(row('t1'), key('ArrowDown', 'ArrowDown'));
		expect(focused()).toBe('t2');
		fireEvent.keyDown(row('t2'), key('ArrowDown', 'ArrowDown', { shiftKey: true }));
		expect(view.setManySelected).toHaveBeenCalledWith(['t2', 't3'], true);
		fireEvent.keyDown(row('t3'), key('ArrowUp', 'ArrowUp'));
		expect(focused()).toBe('t2');
		fireEvent.keyDown(row('t2'), key('Enter', 'Enter'));
		fireEvent.keyDown(row('t2'), key('KeyO', 'o'));
		expect(commands.openTask).toHaveBeenNthCalledWith(1, 't2');
		expect(commands.openTask).toHaveBeenNthCalledWith(2, 't2');
		fireEvent.keyDown(row('t2'), key('Escape', 'Escape'));
		expect(view.clearSelection).toHaveBeenCalledTimes(1);
	});

	it('leaves the second key of a sequence to the registry (`G`, then `O`)', () => {
		const { row, commands } = renderList({ canRebind: true });
		mockSequencePending = true;
		fireEvent.keyDown(row('t1'), key('KeyO', 'o'));
		fireEvent.keyDown(row('t1'), key('KeyD', 'd'));
		expect(commands.openTask).not.toHaveBeenCalled();
		expect(commands.openPicker).not.toHaveBeenCalled();
		mockSequencePending = false;
		fireEvent.keyDown(row('t1'), key('KeyO', 'o'));
		expect(commands.openTask).toHaveBeenCalledWith('t1');
	});
});

describe('TeamTasksList project and due date keys (T10)', () => {
	beforeEach(() => {
		mockSequencePending = false;
	});

	it('opens the project picker with M for the selection the focused row is in, with the registry on', () => {
		const { row, commands } = renderList({ canRebind: true, selected: ['t1', 't2'] });
		fireEvent.keyDown(row('t1'), key('KeyM', 'm'));
		expect(commands.openPicker).toHaveBeenCalledWith('project', ['t1', 't2'], row('t1'), 'M');
		// A row outside the selection: that row alone.
		fireEvent.keyDown(row('t3'), key('KeyM', 'm'));
		expect(commands.openPicker).toHaveBeenLastCalledWith('project', ['t3'], row('t3'), 'M');
	});

	it('gives one due date to the whole selection with the registry on, the focused row alone with it off', () => {
		const on = renderList({ canRebind: true, selected: ['t1', 't2'] });
		fireEvent.keyDown(on.row('t2'), key('KeyD', 'd'));
		expect(on.commands.openPicker).toHaveBeenCalledWith('dueDate', ['t1', 't2'], on.row('t2'), 'D');

		const off = renderList({ canRebind: false, selected: ['t1', 't2'] });
		fireEvent.keyDown(off.row('t2'), key('KeyD', 'd'));
		expect(off.commands.openPicker).toHaveBeenCalledWith('dueDate', ['t2'], off.row('t2'), 'D');
	});

	it('leaves M alone with the registry off: the list keeps the keys it had', () => {
		const { row, commands } = renderList({ canRebind: false });
		fireEvent.keyDown(row('t1'), key('KeyM', 'm'));
		expect(commands.openPicker).not.toHaveBeenCalled();
	});
});

describe('TeamTasksList assignee key', () => {
	beforeEach(() => {
		mockSequencePending = false;
	});

	it('opens the assignees picker with A for the selection the focused row is in, with the registry on', () => {
		const { row, commands } = renderList({ canRebind: true, selected: ['t1', 't2'] });
		fireEvent.keyDown(row('t1'), key('KeyA', 'a'));
		expect(commands.openPicker).toHaveBeenCalledWith('assignees', ['t1', 't2'], row('t1'), 'A');
		// A row outside the selection: that row alone.
		fireEvent.keyDown(row('t3'), key('KeyA', 'a'));
		expect(commands.openPicker).toHaveBeenLastCalledWith('assignees', ['t3'], row('t3'), 'A');
	});

	it('follows the key the person gave it, and no longer answers A', () => {
		const { row, commands } = renderList({ canRebind: true, overrides: { taskAssignee: 'i' } });
		fireEvent.keyDown(row('t1'), key('KeyA', 'a'));
		expect(commands.openPicker).not.toHaveBeenCalled();
		fireEvent.keyDown(row('t1'), key('KeyI', 'i'));
		expect(commands.openPicker).toHaveBeenCalledWith('assignees', ['t1'], row('t1'), 'I');
	});

	it('leaves A alone with the registry off: the list keeps the keys it had', () => {
		const { row, commands } = renderList({ canRebind: false });
		fireEvent.keyDown(row('t1'), key('KeyA', 'a'));
		expect(commands.openPicker).not.toHaveBeenCalled();
	});
});
