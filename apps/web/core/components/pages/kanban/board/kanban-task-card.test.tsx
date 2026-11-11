/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

let mockPending = false;
const mockOpenTask = jest.fn();
let mockSelection: Record<string, unknown> | null = null;

// The drag and drop only registers the card: nothing of it is under test here.
jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({ combine: () => () => undefined }), { virtual: true });
jest.mock(
	'@atlaskit/pragmatic-drag-and-drop/element/adapter',
	() => ({ draggable: () => () => undefined, dropTargetForElements: () => () => undefined }),
	{ virtual: true }
);
jest.mock(
	'@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge',
	() => ({ attachClosestEdge: (data: unknown) => data, extractClosestEdge: () => null }),
	{ virtual: true }
);
jest.mock('./kanban-dnd', () => ({
	IDLE_DRAG_STATE: { type: 'idle' },
	cardData: () => ({}),
	dropEdgeOf: () => null,
	idleUnlessDragging: (state: unknown) => state,
	isCardData: () => false,
	overEdge: () => ({ type: 'idle' })
}));
jest.mock('./kanban-board-context', () => ({
	useKanbanBoardContext: () => ({
		liveTaskId: null,
		openTask: mockOpenTask,
		priorityItems: new Map(),
		sizeItems: new Map()
	}),
	useKanbanSelection: () => mockSelection
}));
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({ isShortcutSequencePending: () => mockPending }));
jest.mock('@/core/hooks/tasks/use-task-worked-seconds', () => ({ useTaskWorkedSeconds: () => 0 }));
jest.mock('./kanban-task-menu', () => ({ KanbanTaskMenu: () => null }));
jest.mock('./kanban-task-title-editor', () => ({ KanbanTaskTitleEditor: () => null }));
jest.mock('@/core/components/teams/people-avatars', () => ({
	AvatarStack: () => null,
	personFromTaskMember: () => ({})
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('@/core/components/tasks/task-data-color', () => ({
	dataColorChipStyle: () => ({}),
	isPaintableColor: () => false
}));
jest.mock('@/core/components/icons', () => ({ Check: () => null }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));

import { KanbanTaskCard } from './kanban-task-card';

const task = { id: 't2', title: 'Second', members: [], tags: [] } as unknown as Parameters<
	typeof KanbanTaskCard
>[0]['task'];

function renderCard(selectedIds: string[]) {
	const selection = {
		selectedIds: new Set(selectedIds),
		toggleSelected: jest.fn(),
		openPicker: jest.fn(),
		bindings: effectiveBindings(SHORTCUT_COMMANDS, null)
	};
	mockSelection = selection;
	render(<KanbanTaskCard task={task} statusId="open" index={0} />);
	const title = screen.getByText('Second');
	return { selection, title, card: title.closest('article') as HTMLElement };
}

describe('a Kanban card with a selection', () => {
	beforeEach(() => {
		mockPending = false;
		mockOpenTask.mockClear();
	});

	it('selects with X (Shift for a range) and with ⌘/Ctrl-click, and opens on a plain click', () => {
		const { selection, title, card } = renderCard([]);
		fireEvent.keyDown(title, { code: 'KeyX', key: 'x' });
		expect(selection.toggleSelected).toHaveBeenLastCalledWith('t2', false);
		fireEvent.keyDown(title, { code: 'KeyX', key: 'X', shiftKey: true });
		expect(selection.toggleSelected).toHaveBeenLastCalledWith('t2', true);
		fireEvent.click(card, { metaKey: true });
		expect(selection.toggleSelected).toHaveBeenCalledTimes(3);
		expect(mockOpenTask).not.toHaveBeenCalled();
		fireEvent.click(card);
		expect(mockOpenTask).toHaveBeenCalledTimes(1);
	});

	it('opens the project picker with M for the whole selection the card is in, and the labels for the card alone', () => {
		const { selection, title, card } = renderCard(['t1', 't2']);
		fireEvent.keyDown(title, { code: 'KeyM', key: 'm' });
		expect(selection.openPicker).toHaveBeenLastCalledWith('project', ['t1', 't2'], card);
		fireEvent.keyDown(title, { code: 'KeyD', key: 'd' });
		expect(selection.openPicker).toHaveBeenLastCalledWith('dueDate', ['t1', 't2'], card);
		fireEvent.keyDown(title, { code: 'KeyL', key: 'l' });
		expect(selection.openPicker).toHaveBeenLastCalledWith('labels', ['t2'], card);
	});

	it('leaves the second key of a registry sequence to the registry', () => {
		const { selection, title } = renderCard([]);
		mockPending = true;
		const event = new KeyboardEvent('keydown', { code: 'KeyX', key: 'x', bubbles: true, cancelable: true });
		title.dispatchEvent(event);
		expect(selection.toggleSelected).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});
});
