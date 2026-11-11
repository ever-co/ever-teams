/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

type MoveTask = (task: { id: string }, status: { id: string }, index: number) => void;

const mockMoveTask = jest.fn();
const mockWarning = jest.fn();
const mockRefetch = jest.fn();
let mockLanes = { isLoading: false, isError: false, statuses: [{ id: 's1' }] as Array<{ id: string }> };
let mockBoardMove: MoveTask | null = null;

jest.mock('@/core/hooks/tasks/use-kanban-lanes', () => ({
	useKanbanLanes: () => ({
		lanes: [],
		statuses: mockLanes.statuses,
		isLoading: mockLanes.isLoading,
		isError: mockLanes.isError,
		refetchTaskStatuses: mockRefetch,
		moveTask: mockMoveTask,
		moveLane: jest.fn(),
		setLaneCollapsed: jest.fn()
	})
}));
jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => ({
	useKeyboardPreferences: () => ({ bindings: new Map() })
}));
// The active team's tasks: `t1` only (a built-in view also lists `t2`, of another team).
jest.mock('jotai', () => ({ useAtomValue: () => [{ id: 't1' }] }));
jest.mock('@/core/stores', () => ({ tasksByTeamState: 'team-tasks' }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { warning: (...args: unknown[]) => mockWarning(...args) } }));
jest.mock('@/core/components/common/modal', () => ({ Modal: () => null }));
jest.mock('@/core/components/common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('@/core/components/optimized-components/tasks', () => ({ LazyEditStatusModal: () => null }));
jest.mock('../../../../kanban/board/kanban-board', () => ({
	KanbanBoard: ({ onMoveTask }: { onMoveTask: MoveTask }) => {
		mockBoardMove = onMoveTask;
		return <div data-testid="board" />;
	}
}));
jest.mock('../../../../kanban/board/kanban-board-skeleton', () => ({
	KanbanBoardSkeleton: () => <div data-testid="skeleton" />
}));
jest.mock('../../../../kanban/board/kanban-board-context', () => {
	const Pass = ({ children }: { children: React.ReactNode }) => <>{children}</>;
	return { KanbanBoardProvider: Pass, KanbanSelectionProvider: Pass };
});
jest.mock('./team-tasks-states', () => ({
	TeamTasksError: ({ onRetry }: { onRetry: () => void }) => (
		<button type="button" onClick={onRetry}>
			error
		</button>
	)
}));

import { TeamTasksBoard } from './team-tasks-board';

function renderBoard() {
	const view = {
		groups: [{ key: 'all', tasks: [{ id: 't1' }, { id: 't2' }] }],
		selectedIds: new Set<string>(),
		toggleSelected: jest.fn(),
		setManySelected: jest.fn()
	} as unknown as Parameters<typeof TeamTasksBoard>[0]['view'];
	const commands = {
		openTask: jest.fn(),
		openPicker: jest.fn(),
		openMenu: jest.fn(),
		createTaskInGroup: jest.fn()
	};
	return render(<TeamTasksBoard view={view} commands={commands} />);
}

describe('a view shown as a board', () => {
	beforeEach(() => {
		mockMoveTask.mockClear();
		mockWarning.mockClear();
		mockLanes = { isLoading: false, isError: false, statuses: [{ id: 's1' }] };
	});

	it("moves a task of the active team, and refuses one of another team onto this team's statuses", () => {
		renderBoard();
		mockBoardMove?.({ id: 't2' }, { id: 's1' }, 0);
		expect(mockMoveTask).not.toHaveBeenCalled();
		expect(mockWarning).toHaveBeenCalledWith('pages.kanban.OTHER_TEAM_MOVE', expect.anything());
		mockBoardMove?.({ id: 't1' }, { id: 's1' }, 0);
		expect(mockMoveTask).toHaveBeenCalledWith({ id: 't1' }, { id: 's1' }, 0);
	});

	it('waits for the statuses, and offers a retry when they could not be read', () => {
		mockLanes = { isLoading: true, isError: false, statuses: [] };
		const { unmount } = renderBoard();
		expect(screen.getByTestId('skeleton')).toBeTruthy();
		unmount();

		mockLanes = { isLoading: false, isError: true, statuses: [] };
		renderBoard();
		screen.getByText('error').click();
		expect(mockRefetch).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('board')).toBeNull();
	});
});
