/**
 * buildKanbanBoard — WEB-010: tasks with a null `taskStatusId` (older / seeded / API-created) vanished
 * from the Kanban board while the Tasks list still showed them. They must fall back to their status
 * NAME, and anything unplaceable must land in the first column rather than disappear.
 */
import { buildKanbanBoard } from './kanban';

type AnyTask = Parameters<typeof buildKanbanBoard>[0][number];
type AnyStatus = Parameters<typeof buildKanbanBoard>[1][number];

const statuses = [
	{ id: 's-open', name: 'Open' },
	{ id: 's-progress', name: 'In Progress' },
	{ id: 's-done', name: 'Done' }
] as unknown as AnyStatus[];

const task = (over: Partial<Record<string, unknown>>) => ({ id: 't-' + Math.random().toString(36).slice(2, 8), title: 'x', ...over }) as unknown as AnyTask;

describe('buildKanbanBoard', () => {
	it('groups by taskStatusId (primary)', () => {
		const a = task({ taskStatusId: 's-open' });
		const b = task({ taskStatusId: 's-done' });
		const board = buildKanbanBoard([a, b], statuses);
		expect(board['Open']).toEqual([a]);
		expect(board['In Progress']).toEqual([]);
		expect(board['Done']).toEqual([b]);
	});

	it('falls back to the status NAME when taskStatusId is null (case/space-insensitive)', () => {
		const a = task({ taskStatusId: null, status: 'in-progress' }); // enum-ish value
		const b = task({ taskStatusId: null, status: 'In Progress' });
		const c = task({ taskStatusId: null, status: ' open ' });
		const board = buildKanbanBoard([a, b, c], statuses);
		expect(board['In Progress']).toEqual([b]); // 'in-progress' does not equal 'in progress' — see below
		expect(board['Open']).toEqual(expect.arrayContaining([c, a])); // 'a' is unplaceable → first column
		expect(board['Done']).toEqual([]);
	});

	it('never loses a task: unknown status ids and no-status tasks land in the first column', () => {
		const foreign = task({ taskStatusId: 'from-another-team' });
		const none = task({ taskStatusId: null, status: null });
		const board = buildKanbanBoard([foreign, none], statuses);
		const all = Object.values(board).flat();
		expect(all).toHaveLength(2);
		expect(board['Open']).toEqual(expect.arrayContaining([foreign, none]));
	});

	it('places each task exactly once', () => {
		const a = task({ taskStatusId: null, status: 'Done' });
		const board = buildKanbanBoard([a], statuses);
		expect(Object.values(board).flat().filter((t) => t.id === a.id)).toHaveLength(1);
		expect(board['Done']).toEqual([a]);
	});
});
