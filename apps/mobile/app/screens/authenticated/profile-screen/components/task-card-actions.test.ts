import { TaskCardHandlers, taskCardActionsOf } from './task-card-actions';

const handlers: TaskCardHandlers = {
	editTitle: jest.fn(),
	editEstimate: jest.fn(),
	assign: jest.fn(),
	unassign: jest.fn()
};
const label = (key: string) => key;

describe("the actions of a task card's sheet", () => {
	it('offers to unassign a task the person holds, after Edit Task and Estimate', () => {
		const actions = taskCardActionsOf(true, handlers, label);

		expect(actions.map((action) => action.key)).toEqual(['edit-task', 'estimate', 'unassign']);
		expect(actions[2].onPress).toBe(handlers.unassign);
	});

	it('offers to assign a task the person does not hold', () => {
		const actions = taskCardActionsOf(false, handlers, label);

		expect(actions.map((action) => action.key)).toEqual(['edit-task', 'estimate', 'assign']);
		expect(actions[2].onPress).toBe(handlers.assign);
	});
});
