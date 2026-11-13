/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

type Status = { id: string; name: string; order: number; isCollapsed?: boolean };
type Answer = { resolve: (value: { affected: number }) => void; reject: (error: unknown) => void };

// The statuses as their query holds them; `setTaskStatuses` writes a new list, as the query cache does.
let mockStatuses: Status[] = [];
const mockAnswers: Answer[] = [];
const mockEditTaskStatus = jest.fn(
	() =>
		new Promise<{ affected: number }>((resolve, reject) => {
			mockAnswers.push({ resolve, reject });
		})
);

jest.mock('./use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: mockStatuses,
		getTaskStatusesLoading: false,
		isError: false,
		refetch: jest.fn(),
		setTaskStatuses: (update: (current: Status[]) => Status[]) => {
			mockStatuses = update(mockStatuses);
		}
	})
}));
jest.mock('./use-edit-task-status', () => ({ useEditTaskStatus: () => ({ editTaskStatus: mockEditTaskStatus }) }));
jest.mock('../organizations', () => ({ useUpdateTask: () => ({ updateTask: jest.fn() }) }));

import { useKanbanLanes } from './use-kanban-lanes';

const TODO: Status = { id: 'todo', name: 'todo', order: 0, isCollapsed: false };
const DONE: Status = { id: 'done', name: 'done', order: 1, isCollapsed: false };

function shownTodo(result: { current: ReturnType<typeof useKanbanLanes> }) {
	return result.current.statuses.find((status) => status.id === TODO.id);
}

function collapse(result: { current: ReturnType<typeof useKanbanLanes> }, isCollapsed: boolean) {
	act(() => {
		result.current.setLaneCollapsed(shownTodo(result) as never, isCollapsed);
	});
}

async function answer(index: number, outcome: { affected: number } | Error) {
	await act(async () => {
		if (outcome instanceof Error) mockAnswers[index].reject(outcome);
		else mockAnswers[index].resolve(outcome);
	});
}

describe('the saves of a board lane', () => {
	beforeEach(() => {
		mockStatuses = [TODO, DONE];
		mockAnswers.length = 0;
		mockEditTaskStatus.mockClear();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});
	afterEach(() => jest.restoreAllMocks());

	it('keeps the latest change when an older save fails after it succeeded', async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		collapse(result, true);
		expect(mockEditTaskStatus).toHaveBeenCalledTimes(3);

		// The third save (collapsed) is saved; then the first one fails.
		await answer(2, { affected: 1 });
		rerender();
		await answer(0, new Error('network'));
		rerender();

		expect(shownTodo(result)?.isCollapsed).toBe(true);
	});

	it("shows the statuses' own value once the latest save is refused", async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		collapse(result, true);

		// The latest save fails: the lane shows the statuses' own value, as nothing of the three was saved.
		await answer(2, { affected: 0 });
		rerender();
		expect(shownTodo(result)?.isCollapsed).toBe(false);
	});

	it("shows a later value of the statuses (another person's change) once its own save succeeded", async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		await answer(0, { affected: 1 });
		rerender();
		expect(shownTodo(result)?.isCollapsed).toBe(true);

		// Someone else expands the lane: the statuses read again hold it.
		mockStatuses = mockStatuses.map((status) =>
			status.id === TODO.id ? { ...status, isCollapsed: false } : status
		);
		rerender();

		expect(shownTodo(result)?.isCollapsed).toBe(false);
	});

	it('keeps showing a change while its save is on its way, whatever the statuses read meanwhile', () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);

		mockStatuses = mockStatuses.map((status) => ({ ...status }));
		rerender();

		expect(shownTodo(result)?.isCollapsed).toBe(true);
	});

	it('keeps the lane order the latest move saved when an older move fails after it', async () => {
		mockStatuses = [
			{ id: 'a', name: 'a', order: 0 },
			{ id: 'b', name: 'b', order: 1 },
			{ id: 'c', name: 'c', order: 2 }
		];
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		const order = () => result.current.statuses.map((status) => status.id);
		act(() => result.current.moveLane('a', 2));
		expect(order()).toEqual(['b', 'c', 'a']);
		act(() => result.current.moveLane('b', 2));
		expect(order()).toEqual(['c', 'a', 'b']);
		expect(mockEditTaskStatus).toHaveBeenCalledTimes(6);

		// The second move's three saves succeed; then the first move's three fail.
		for (const index of [3, 4, 5]) await answer(index, { affected: 1 });
		rerender();
		for (const index of [0, 1, 2]) await answer(index, new Error('network'));
		rerender();

		expect(order()).toEqual(['c', 'a', 'b']);
	});
});
