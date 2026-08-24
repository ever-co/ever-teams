/** @jest-environment jsdom */

import { act, render } from '@testing-library/react';

const calls = {
	teams: jest.fn(),
	tasks: jest.fn(),
	timer: jest.fn(),
	autoAssign: jest.fn(),
	statistics: jest.fn(),
	polling: jest.fn(),
	timeLogs: jest.fn(),
	guard: jest.fn()
};

let user: any = null;
let workspaceSuccess = false;
let currentWorkspace: any = null;
let teams: any[] = [];
let activeTeam: any = null;
let teamsSuccess = false;
let teamSuccess = false;
let tasksSuccess = false;
let activeTask: any = null;
let timerSuccess = false;
let plansSuccess = false;
let rawTimerRunning = false;
let accessToken = 'token-1';

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: user })
}));
jest.mock('@/core/hooks/auth', () => ({
	useWorkspaces: () => ({
		currentWorkspace,
		workspacesQuery: { isSuccess: workspaceSuccess }
	})
}));
jest.mock('@/core/hooks/organizations', () => ({
	useOrganizationTeamsQuery: (options: unknown) => {
		calls.teams(options);
		return { teams, activeTeam, organizationTeamsSuccess: teamsSuccess, organizationTeamSuccess: teamSuccess };
	},
	useTeamTasksQuery: (options: unknown) => {
		calls.tasks(options);
		return { activeTeamTask: activeTask, querySuccess: tasksSuccess };
	}
}));
jest.mock('@/core/hooks/activities', () => ({
	useTimer: (options: unknown) => {
		calls.timer(options);
		return {
			statusResolved: timerSuccess,
			plansResolved: plansSuccess,
			rawTimerRunning,
			syncTimer: jest.fn(),
			firstLoadTimerData: jest.fn()
		};
	}
}));
jest.mock('@/core/hooks/tasks', () => ({
	useAutoAssignTask: (options: unknown) => calls.autoAssign(options),
	useTaskStatistics: (_seconds: number, options: unknown) => calls.statistics(options)
}));
jest.mock('@/core/hooks/activities/use-timer-polling', () => ({
	useTimerPolling: (running: boolean) => calls.polling(running)
}));
jest.mock('@/core/hooks/activities/time-logs/use-time-logs', () => ({
	useTimeLogs: () => calls.timeLogs()
}));
jest.mock('./use-scope-transition-guard', () => ({
	useScopeTransitionGuard: (scope: unknown, enabled: boolean) => calls.guard(scope, enabled)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => accessToken
}));

import { FastInitState } from './fast-init-state';

function resetState() {
	user = null;
	workspaceSuccess = false;
	currentWorkspace = null;
	teams = [];
	activeTeam = null;
	teamsSuccess = false;
	teamSuccess = false;
	tasksSuccess = false;
	activeTask = null;
	timerSuccess = false;
	plansSuccess = false;
	rawTimerRunning = false;
	accessToken = 'token-1';
	jest.clearAllMocks();
}

function resolveWorkspace() {
	user = {
		id: 'user-1',
		tenantId: 'tenant-1',
		employee: { id: 'employee-1', tenantId: 'tenant-1', organizationId: 'org-1' }
	};
	workspaceSuccess = true;
	currentWorkspace = { user: { tenant: { id: 'tenant-1' } } };
}

function resolveTeam(requirePlanToTrack = false) {
	activeTeam = {
		id: 'team-1',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		requirePlanToTrack,
		projects: [{ id: 'project-1' }]
	};
	teams = [activeTeam];
	teamsSuccess = true;
	teamSuccess = true;
}

describe('FastInitState dependency DAG', () => {
	beforeEach(() => {
		resetState();
		if (!performance.mark) Object.defineProperty(performance, 'mark', { configurable: true, value: jest.fn() });
		jest.spyOn(performance, 'mark').mockImplementation(() => ({}) as PerformanceMark);
	});

	afterEach(() => jest.restoreAllMocks());

	it('does not enable a dependent phase before its complete parent scope', () => {
		const view = render(<FastInitState />);
		expect(calls.teams).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
		expect(calls.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
		expect(calls.timer).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		act(resolveWorkspace);
		view.rerender(<FastInitState />);
		expect(calls.teams).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
		expect(calls.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		act(() => resolveTeam(false));
		view.rerender(<FastInitState />);
		expect(calls.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
		expect(calls.timer).toHaveBeenLastCalledWith(
			expect.objectContaining({ enabled: true, plansEnabled: true, manageRuntime: false })
		);
	});

	it('always loads personal plans but only makes them critical when team policy requires them', () => {
		resolveWorkspace();
		resolveTeam(false);
		tasksSuccess = true;
		timerSuccess = true;
		plansSuccess = false;
		const view = render(<FastInitState />);

		expect(calls.timer).toHaveBeenLastCalledWith(expect.objectContaining({ plansEnabled: true }));
		expect(performance.mark).toHaveBeenCalledWith('ever-teams:shell-ready');

		view.unmount();
		jest.mocked(performance.mark).mockClear();
		activeTeam = { ...activeTeam, id: 'team-2', requirePlanToTrack: true };
		teams = [activeTeam];
		const requiredView = render(<FastInitState />);
		expect(jest.mocked(performance.mark).mock.calls.filter(([name]) => name === 'ever-teams:shell-ready')).toEqual(
			[]
		);

		plansSuccess = true;
		requiredView.rerender(<FastInitState />);
		expect(performance.mark).toHaveBeenCalledWith('ever-teams:shell-ready');
	});

	it('enables task follow-ups only when their own prerequisites resolve', () => {
		resolveWorkspace();
		resolveTeam();
		render(<FastInitState />);
		expect(calls.autoAssign).toHaveBeenLastCalledWith({ enabled: false });
		expect(calls.statistics).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		timerSuccess = true;
		activeTask = { id: 'task-1' };
		render(<FastInitState />);
		expect(calls.autoAssign).toHaveBeenLastCalledWith({ enabled: true });
		expect(calls.statistics).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
	});

	it('owns one timer facade, one time-log observer, and no duplicate token scheduler', () => {
		resolveWorkspace();
		resolveTeam();
		rawTimerRunning = true;
		render(<FastInitState />);

		expect(calls.timer).toHaveBeenCalledTimes(1);
		expect(calls.timeLogs).toHaveBeenCalledTimes(1);
		expect(calls.polling).toHaveBeenLastCalledWith(true);
		expect(calls.timer.mock.calls[0][0]).not.toHaveProperty('scheduleTokenRefresh');
	});

	it('replaces every core owner scope after any access-token rotation', () => {
		resolveWorkspace();
		resolveTeam();
		render(<FastInitState />);
		expect(calls.tasks).toHaveBeenLastCalledWith(
			expect.objectContaining({ scope: expect.objectContaining({ accessToken: 'token-1' }) })
		);

		act(() => {
			accessToken = 'token-2';
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});

		expect(calls.tasks).toHaveBeenLastCalledWith(
			expect.objectContaining({ scope: expect.objectContaining({ accessToken: 'token-2' }) })
		);
		expect(calls.timer).toHaveBeenLastCalledWith(
			expect.objectContaining({ scope: expect.objectContaining({ accessToken: 'token-2' }) })
		);
	});
});
