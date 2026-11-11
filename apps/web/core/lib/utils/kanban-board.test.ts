import { laneRangeIds, type KanbanLane } from './kanban-board';

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
