/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

type Status = { id: string; name: string; order: number; isCollapsed?: boolean };
type Field = 'order' | 'isCollapsed';
type Request = {
	statusId: string;
	data: Partial<Status>;
	ended: boolean;
	resolve: (value: { affected: number }) => void;
	reject: (error: unknown) => void;
};

// The statuses as their query holds them; `setTaskStatuses` writes a new list, as the query cache does.
let mockStatuses: Status[] = [];
// The statuses the server holds: a write changes them when it lands, whatever the order it was sent in.
let serverStatuses: Status[] = [];
// Every write sent, in the order sent, and each write sent while another of the same field of that status was on its way.
const mockRequests: Request[] = [];
const mockOverlaps: Request[] = [];
const mockSetTaskStatuses = jest.fn((update: (current: Status[]) => Status[]) => {
	mockStatuses = update(mockStatuses);
});
const mockEditTaskStatus = jest.fn(
	(statusId: string, data: Partial<Status>) =>
		new Promise<{ affected: number }>((resolve, reject) => {
			const request = { statusId, data, ended: false, resolve, reject };
			const sameField = (other: Request) =>
				!other.ended && other.statusId === statusId && Object.keys(data).some((field) => field in other.data);
			if (mockRequests.some(sameField)) mockOverlaps.push(request);
			mockRequests.push(request);
		})
);

jest.mock('./use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: mockStatuses,
		getTaskStatusesLoading: false,
		isError: false,
		refetch: jest.fn(),
		setTaskStatuses: mockSetTaskStatuses
	})
}));
jest.mock('./use-edit-task-status', () => ({ useEditTaskStatus: () => ({ editTaskStatus: mockEditTaskStatus }) }));
jest.mock('../organizations', () => ({ useUpdateTask: () => ({ updateTask: jest.fn() }) }));

import { useKanbanLanes } from './use-kanban-lanes';

type Board = { current: ReturnType<typeof useKanbanLanes> };

const TODO: Status = { id: 'todo', name: 'todo', order: 0, isCollapsed: false };
const DONE: Status = { id: 'done', name: 'done', order: 1, isCollapsed: false };

function shownTodo(result: Board) {
	return result.current.statuses.find((status) => status.id === TODO.id);
}

function shownOrder(result: Board) {
	return result.current.statuses.map((status) => status.id);
}

function serverOrder() {
	return [...serverStatuses].sort((a, b) => a.order - b.order).map((status) => status.id);
}

function serverTodo() {
	return serverStatuses.find((status) => status.id === TODO.id);
}

/** The values sent for one field of one status, in the order sent. */
function sentValues(statusId: string, field: Field) {
	return mockRequests
		.filter((request) => request.statusId === statusId && field in request.data)
		.map((request) => request.data[field]);
}

function collapse(result: Board, isCollapsed: boolean) {
	act(() => {
		result.current.setLaneCollapsed(shownTodo(result) as never, isCollapsed);
	});
}

/** The write lands: the server holds its value from now on and answers that it changed. */
async function land(request: Request) {
	serverStatuses = serverStatuses.map((status) =>
		status.id === request.statusId ? { ...status, ...request.data } : status
	);
	request.ended = true;
	await act(async () => request.resolve({ affected: 1 }));
}

/** The write is refused (nothing changed) or fails: the server keeps what it held. */
async function answer(request: Request, outcome: { affected: 0 } | Error) {
	request.ended = true;
	await act(async () => {
		if (outcome instanceof Error) request.reject(outcome);
		else request.resolve(outcome);
	});
}

/** Lands every write on its way, the newest first, then the writes that were waiting for them, until none is left. */
async function landNewestFirst() {
	const openRequests = () => mockRequests.filter((request) => !request.ended);
	for (let open = openRequests(); open.length > 0; open = openRequests()) {
		await land(open[open.length - 1]);
	}
}

describe('the saves of a board lane', () => {
	beforeEach(() => {
		mockStatuses = [TODO, DONE];
		serverStatuses = [TODO, DONE];
		mockRequests.length = 0;
		mockOverlaps.length = 0;
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});
	afterEach(() => jest.restoreAllMocks());

	it('ends with the latest value on the server when the older write would land after the newer one', async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);

		await landNewestFirst();
		rerender();

		expect(serverTodo()?.isCollapsed).toBe(false);
		expect(shownTodo(result)?.isCollapsed).toBe(false);
		expect(sentValues(TODO.id, 'isCollapsed')).toEqual([true, false]);
		expect(mockOverlaps).toEqual([]);
	});

	it('sends two writes for a lane collapsed, expanded and collapsed again quickly, the latest one last', async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		collapse(result, true);
		expect(mockEditTaskStatus).toHaveBeenCalledTimes(1);

		await landNewestFirst();
		rerender();

		expect(sentValues(TODO.id, 'isCollapsed')).toEqual([true, true]);
		expect(serverTodo()?.isCollapsed).toBe(true);
		expect(shownTodo(result)?.isCollapsed).toBe(true);
	});

	it.each([
		['fails', new Error('network')],
		['is refused', { affected: 0 } as const]
	])('still sends the latest value when the write on its way %s', async (_, outcome) => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		expect(mockEditTaskStatus).toHaveBeenCalledTimes(1);

		await answer(mockRequests[0], outcome);
		expect(sentValues(TODO.id, 'isCollapsed')).toEqual([true, false]);
		// The latest value shows while its write is on its way.
		rerender();
		expect(shownTodo(result)?.isCollapsed).toBe(false);

		await land(mockRequests[1]);
		rerender();
		expect(serverTodo()?.isCollapsed).toBe(false);
		expect(shownTodo(result)?.isCollapsed).toBe(false);
	});

	it("shows the statuses' own value once the latest save is refused", async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		collapse(result, true);

		// Neither write is saved: the lane shows the statuses' own value, as nothing of the three was saved.
		await answer(mockRequests[0], { affected: 0 });
		await answer(mockRequests[1], { affected: 0 });
		rerender();
		expect(mockEditTaskStatus).toHaveBeenCalledTimes(2);
		expect(shownTodo(result)?.isCollapsed).toBe(false);
	});

	it("shows a later value of the statuses (another person's change) once its own save succeeded", async () => {
		const { result, rerender } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		await land(mockRequests[0]);
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

	describe('lane order', () => {
		const A: Status = { id: 'a', name: 'a', order: 0 };
		const B: Status = { id: 'b', name: 'b', order: 1 };
		const C: Status = { id: 'c', name: 'c', order: 2 };
		const D: Status = { id: 'd', name: 'd', order: 3 };

		it('ends with the latest order on the server when the writes of two quick moves land out of order', async () => {
			mockStatuses = [A, B, C];
			serverStatuses = [A, B, C];
			const { result, rerender } = renderHook(() => useKanbanLanes([]));
			act(() => result.current.moveLane('a', 2));
			act(() => result.current.moveLane('b', 2));
			expect(shownOrder(result)).toEqual(['c', 'a', 'b']);
			const sentBeforeAnswers = mockEditTaskStatus.mock.calls.length;

			await landNewestFirst();
			rerender();

			expect(serverOrder()).toEqual(['c', 'a', 'b']);
			expect(shownOrder(result)).toEqual(['c', 'a', 'b']);
			// Every lane's place changed twice: the second move's writes waited for the first move's.
			expect(sentBeforeAnswers).toBe(3);
			expect(mockOverlaps).toEqual([]);
		});

		it('sends two writes for a lane moved three times quickly, its latest place last', async () => {
			mockStatuses = [A, B, C, D];
			serverStatuses = [A, B, C, D];
			const { result, rerender } = renderHook(() => useKanbanLanes([]));
			act(() => result.current.moveLane('a', 1));
			act(() => result.current.moveLane('a', 2));
			act(() => result.current.moveLane('a', 3));
			expect(shownOrder(result)).toEqual(['b', 'c', 'd', 'a']);

			await landNewestFirst();
			rerender();

			expect(sentValues('a', 'order')).toEqual([1, 3]);
			expect(serverOrder()).toEqual(['b', 'c', 'd', 'a']);
			expect(shownOrder(result)).toEqual(['b', 'c', 'd', 'a']);
		});

		it('keeps the lane order the latest move saved when the older move fails', async () => {
			mockStatuses = [A, B, C];
			serverStatuses = [A, B, C];
			const { result, rerender } = renderHook(() => useKanbanLanes([]));
			act(() => result.current.moveLane('a', 2));
			act(() => result.current.moveLane('b', 2));

			// The first move's three writes fail; then the second move's three, sent after them, are saved.
			for (const request of [...mockRequests]) await answer(request, new Error('network'));
			expect(mockEditTaskStatus).toHaveBeenCalledTimes(6);
			for (const request of mockRequests.slice(3)) await land(request);
			rerender();

			expect(serverOrder()).toEqual(['c', 'a', 'b']);
			expect(shownOrder(result)).toEqual(['c', 'a', 'b']);
		});
	});

	it('still sends the latest value of a board left meanwhile, and changes nothing of it', async () => {
		const { result, unmount } = renderHook(() => useKanbanLanes([]));
		collapse(result, true);
		collapse(result, false);
		unmount();

		await landNewestFirst();

		expect(sentValues(TODO.id, 'isCollapsed')).toEqual([true, false]);
		expect(serverTodo()?.isCollapsed).toBe(false);
		expect(mockSetTaskStatuses).not.toHaveBeenCalled();
	});
});
