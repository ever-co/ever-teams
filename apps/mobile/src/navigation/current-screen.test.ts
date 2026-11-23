import { profileParamsOf, taskParamsOf } from './current-screen';

describe('the params a current screen reads from its address', () => {
	it('are the member and the tab of a profile, as it read them by name', () => {
		expect(profileParamsOf({ memberId: 'user-kofi', activeTab: 'assigned' })).toEqual({
			userId: 'user-kofi',
			activeTab: 'assigned'
		});
	});

	it('open the worked tasks of a profile when the address names no tab', () => {
		expect(profileParamsOf({ memberId: 'user-kofi' })).toEqual({ userId: 'user-kofi', activeTab: 'worked' });
	});

	it('are the task of a task screen', () => {
		expect(taskParamsOf({ id: 'task-har-3' })).toEqual({ taskId: 'task-har-3' });
		expect(taskParamsOf({ id: ['task-har-3', 'another'] })).toEqual({ taskId: 'task-har-3' });
	});
});
