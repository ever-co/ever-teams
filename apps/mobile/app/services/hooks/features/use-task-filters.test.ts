import { act, renderHook } from '@testing-library/react-native';
import { useTaskFilter } from './use-task-filters';
import { ITeamTask } from '../../interfaces/ITask';
import { IUserProfile } from '../../../screens/authenticated/profile-screen/logics/use-profile-screen-logic';

const PAINT = {
	id: 'paint',
	title: 'Paint the hatch',
	status: 'in-progress',
	priority: 'high',
	size: 'medium',
	tags: [{ name: 'Outdoor' }]
};
const BOLTS = { id: 'bolts', title: 'Inspect the bolts', status: 'open', priority: 'low', size: 'small', tags: [] };

function profileWith(tasks: object[]) {
	return {
		activeTab: 'worked',
		tasksGrouped: { workedTasks: tasks as ITeamTask[], assignedTasks: [], unassignedTasks: [] }
	} as unknown as IUserProfile;
}

function idsOf(tasks: ITeamTask[]) {
	return tasks.map((task) => task.id);
}

describe("a profile's task filter", () => {
	it('applies a filter at once, as the web filter menu does, and clears it', async () => {
		const { result } = await renderHook(() => useTaskFilter(profileWith([PAINT, BOLTS])));

		await act(async () => result.current.changeStatusFilter('status', ['in-progress']));

		expect(idsOf(result.current.tasksFiltered)).toEqual(['paint']);
		expect(result.current.appliedStatusFilter.status).toEqual(['in-progress']);

		await act(async () => result.current.onResetStatusFilter());

		expect(idsOf(result.current.tasksFiltered)).toEqual(['paint', 'bolts']);
	});
});
