import { buildKanbanLanes, laneRangeIds, type KanbanLane } from './kanban-board';

const lane = (statusId: string, ids: string[]) =>
	({ status: { id: statusId }, tasks: ids.map((id) => ({ id })) }) as unknown as KanbanLane;

describe('a Shift-click range on a board', () => {
	const lanes = [lane('open', ['a', 'b', 'c', 'd']), lane('done', ['e', 'f'])];

	it('takes the cards between the two, both included, in the lane order whichever was first', () => {
		expect(laneRangeIds(lanes, 'b', 'd')).toEqual(['b', 'c', 'd']);
		expect(laneRangeIds(lanes, 'd', 'a')).toEqual(['a', 'b', 'c', 'd']);
		expect(laneRangeIds(lanes, 'e', 'e')).toEqual(['e']);
	});

	it('takes nothing across lanes, or for a card no longer on the board', () => {
		expect(laneRangeIds(lanes, 'b', 'f')).toBeNull();
		expect(laneRangeIds(lanes, 'gone', 'a')).toBeNull();
	});
});

describe('the lane of a task', () => {
	const statuses = [
		{ id: 's-open', name: 'Open', order: 0 },
		{ id: 's-done', name: 'Done', order: 1 }
	] as unknown as Parameters<typeof buildKanbanLanes>[1];
	const task = (id: string, extra: Record<string, unknown>) =>
		({ id, ...extra }) as unknown as Parameters<typeof buildKanbanLanes>[0][number];

	it('is its status by id, then by name (a task of another team with the same statuses), else the first lane', () => {
		const lanes = buildKanbanLanes(
			[
				task('by-id', { taskStatusId: 's-done', status: 'open' }),
				task('by-name', { taskStatusId: 'other-team-done', status: 'done' }),
				task('unknown', { taskStatusId: 'other-team-review', status: 'in review' })
			],
			statuses,
			{}
		);
		expect(lanes.map((lane) => [lane.status.id, lane.tasks.map((item) => item.id)])).toEqual([
			['s-open', ['unknown']],
			['s-done', ['by-id', 'by-name']]
		]);
	});
});
