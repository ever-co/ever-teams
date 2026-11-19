import { router } from 'expo-router';
import { hrefOf, markRouterMounted, navigateTo } from './routes';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));

describe('the address of a screen', () => {
	it('is the team at the root, as on the web, and the Work tab at /timer', () => {
		expect(hrefOf('Team')).toBe('/');
		expect(hrefOf('AuthenticatedTab')).toBe('/');
		expect(hrefOf('Timer')).toBe('/timer');
	});

	it('names the member and the tab of a profile', () => {
		expect(hrefOf('Profile', { userId: 'user-kofi', activeTab: 'assigned' })).toEqual({
			pathname: '/profile/[memberId]',
			params: { memberId: 'user-kofi', activeTab: 'assigned' }
		});
		expect(hrefOf('Profile', { userId: 'user-kofi', tabIndex: 0 })).toEqual({
			pathname: '/profile/[memberId]',
			params: { memberId: 'user-kofi' }
		});
	});

	it('names the task of a task screen', () => {
		expect(hrefOf('TaskScreen', { taskId: 'task-har-3' })).toEqual({
			pathname: '/task/[id]',
			params: { id: 'task-har-3' }
		});
	});

	it("opens the personal settings, or the team's when the team tab is asked for", () => {
		expect(hrefOf('Setting')).toBe('/settings/personal');
		expect(hrefOf('Setting', { activeTab: 1 })).toBe('/settings/personal');
		expect(hrefOf('Setting', { activeTab: 2 })).toBe('/settings/team');
	});

	it("puts the team's task settings under the team settings, as on the web", () => {
		expect(hrefOf('TaskStatus', { previousTab: 2 })).toBe('/settings/team/statuses');
		expect(hrefOf('TaskPriority')).toBe('/settings/team/priorities');
		expect(hrefOf('TaskSizeScreen')).toBe('/settings/team/sizes');
		expect(hrefOf('TaskLabelScreen')).toBe('/settings/team/labels');
		expect(hrefOf('TaskVersion')).toBe('/settings/team/versions');
		expect(hrefOf('MembersSettingsScreen')).toBe('/settings/team/members');
	});
});

describe('opening a screen', () => {
	it('goes by name in the React Navigation app, as the screen did', () => {
		const navigation = { navigate: jest.fn() };

		navigateTo(navigation, 'TaskScreen', { taskId: 'task-har-3' });

		expect(navigation.navigate).toHaveBeenCalledWith('TaskScreen', { taskId: 'task-har-3' });
		expect(router.navigate).not.toHaveBeenCalled();
	});

	it('goes to the address once the Expo Router app runs', () => {
		const navigation = { navigate: jest.fn() };
		markRouterMounted();

		navigateTo(navigation, 'Setting', { activeTab: 2 });

		expect(router.navigate).toHaveBeenCalledWith('/settings/team');
		expect(navigation.navigate).not.toHaveBeenCalled();
	});
});
