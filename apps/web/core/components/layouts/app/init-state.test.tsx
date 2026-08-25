/** @jest-environment jsdom */

import { act, render } from '@testing-library/react';

const mockInvalidateQueries = jest.fn(() => Promise.resolve());
const mockCancelQueries = jest.fn(() => Promise.resolve());
let mockCredentialQueries: Array<{ queryKey: readonly unknown[]; meta?: Record<string, unknown> }> = [];
const mockQueryClient = {
	cancelQueries: mockCancelQueries,
	invalidateQueries: mockInvalidateQueries,
	getQueryCache: () => ({
		findAll: ({ predicate }: { predicate?: (query: (typeof mockCredentialQueries)[number]) => boolean }) =>
			predicate ? mockCredentialQueries.filter(predicate) : mockCredentialQueries
	})
};

const calls = {
	teams: jest.fn(),
	tasks: jest.fn(),
	timer: jest.fn(),
	autoAssign: jest.fn(),
	statistics: jest.fn(),
	polling: jest.fn(),
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

jest.mock('@tanstack/react-query', () => ({
	...jest.requireActual('@tanstack/react-query'),
	useQueryClient: () => mockQueryClient
}));

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
jest.mock('./use-scope-transition-guard', () => ({
	useScopeTransitionGuard: (scope: unknown, enabled: boolean) => calls.guard(scope, enabled),
	getShellCriticalQueryKeys: (scope: any) => [
		['organization-teams', 'list-scope', scope.tenantId, scope.organizationId],
		['organization-teams', 'detail-scope', scope.tenantId, scope.organizationId, scope.teamId],
		['tasks', 'by-team-scope', scope.tenantId, scope.organizationId, scope.teamId, scope.projectId],
		['timer', 'scope', scope.tenantId, scope.organizationId, scope.teamId, scope.userId],
		['daily-plans', 'my-plans-scope', scope.tenantId, scope.organizationId, scope.teamId, scope.userId],
		[
			'tasks',
			'statistics-scope',
			scope.tenantId,
			scope.organizationId,
			scope.teamId,
			scope.taskId,
			scope.employeeId
		]
	]
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => accessToken
}));

import { InitState } from './init-state';

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
	mockCredentialQueries = [];
	jest.clearAllMocks();
	mockCancelQueries.mockResolvedValue(undefined);
	mockInvalidateQueries.mockResolvedValue(undefined);
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

describe('InitState dependency DAG', () => {
	beforeEach(() => {
		resetState();
		if (!performance.mark) Object.defineProperty(performance, 'mark', { configurable: true, value: jest.fn() });
		jest.spyOn(performance, 'mark').mockImplementation(() => ({}) as PerformanceMark);
	});

	afterEach(() => jest.restoreAllMocks());

	it('does not enable a dependent phase before its complete parent scope', () => {
		const view = render(<InitState />);
		expect(calls.teams).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
		expect(calls.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
		expect(calls.timer).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		act(resolveWorkspace);
		view.rerender(<InitState />);
		expect(calls.teams).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
		expect(calls.tasks).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		act(() => resolveTeam(false));
		view.rerender(<InitState />);
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
		const view = render(<InitState />);

		expect(calls.timer).toHaveBeenLastCalledWith(expect.objectContaining({ plansEnabled: true }));
		expect(performance.mark).toHaveBeenCalledWith('ever-teams:shell-ready');

		view.unmount();
		jest.mocked(performance.mark).mockClear();
		activeTeam = { ...activeTeam, id: 'team-2', requirePlanToTrack: true };
		teams = [activeTeam];
		const requiredView = render(<InitState />);
		expect(jest.mocked(performance.mark).mock.calls.filter(([name]) => name === 'ever-teams:shell-ready')).toEqual(
			[]
		);

		plansSuccess = true;
		requiredView.rerender(<InitState />);
		expect(performance.mark).toHaveBeenCalledWith('ever-teams:shell-ready');
	});

	it('enables task follow-ups only when their own prerequisites resolve', () => {
		resolveWorkspace();
		resolveTeam();
		render(<InitState />);
		expect(calls.autoAssign).toHaveBeenLastCalledWith({ enabled: false });
		expect(calls.statistics).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

		timerSuccess = true;
		activeTask = { id: 'task-1' };
		render(<InitState />);
		expect(calls.autoAssign).toHaveBeenLastCalledWith({ enabled: true });
		expect(calls.statistics).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
	});

	it('owns one timer facade without a global time-log preload or duplicate token scheduler', () => {
		resolveWorkspace();
		resolveTeam();
		rawTimerRunning = true;
		render(<InitState />);

		expect(calls.timer).toHaveBeenCalledTimes(1);
		expect(calls.polling).toHaveBeenLastCalledWith(true);
		expect(calls.timer.mock.calls[0][0]).not.toHaveProperty('scheduleTokenRefresh');
	});

	it('replaces every core owner scope after any access-token rotation', async () => {
		resolveWorkspace();
		resolveTeam();
		activeTask = { id: 'task-1' };
		render(<InitState />);
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
		await act(async () => Promise.resolve());
		for (const queryKey of [
			['tasks', 'by-team-scope', 'tenant-1', 'org-1', 'team-1', 'project-1'],
			['timer', 'scope', 'tenant-1', 'org-1', 'team-1', 'user-1'],
			['daily-plans', 'my-plans-scope', 'tenant-1', 'org-1', 'team-1', 'user-1'],
			['tasks', 'statistics-scope', 'tenant-1', 'org-1', 'team-1', 'task-1', 'employee-1']
		]) {
			expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey, exact: true });
			expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey, exact: true, refetchType: 'active' });
		}
		expect(Math.min(...mockInvalidateQueries.mock.invocationCallOrder)).toBeGreaterThan(
			Math.max(...mockCancelQueries.mock.invocationCallOrder)
		);
	});

	it('re-owns workspace reads when the token rotates while team bootstrap is still pending', async () => {
		resolveWorkspace();
		render(<InitState />);
		mockCancelQueries.mockClear();
		mockInvalidateQueries.mockClear();

		act(() => {
			accessToken = 'token-2';
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});
		await act(async () => Promise.resolve());

		const listKey = ['organization-teams', 'list-scope', 'tenant-1', 'org-1'];
		expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey: listKey, exact: true });
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: listKey,
			exact: true,
			refetchType: 'active'
		});
	});

	it('re-owns a mounted credential query when the token rotates before workspace bootstrap resolves', async () => {
		const routeKey = ['roles', 'scope', 'tenant-1'] as const;
		mockCredentialQueries = [{ queryKey: routeKey, meta: { credentialScoped: true } }];
		render(<InitState />);
		mockCancelQueries.mockClear();
		mockInvalidateQueries.mockClear();

		act(() => {
			accessToken = 'token-2';
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});
		await act(async () => Promise.resolve());

		expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey: routeKey, exact: true });
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: routeKey,
			exact: true,
			refetchType: 'active'
		});
	});

	it('does not restart an old scope when it changes while cancellation is pending', async () => {
		resolveWorkspace();
		resolveTeam();
		let releaseCancel!: () => void;
		const cancellationGate = new Promise<void>((resolve) => {
			releaseCancel = resolve;
		});
		mockCancelQueries.mockReturnValue(cancellationGate);
		const view = render(<InitState />);
		mockCancelQueries.mockClear();
		mockInvalidateQueries.mockClear();

		act(() => {
			accessToken = 'token-2';
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});
		expect(mockCancelQueries).toHaveBeenCalled();

		act(() => {
			user = {
				...user,
				employee: { ...user.employee, tenantId: 'tenant-2', organizationId: 'org-2' }
			};
			currentWorkspace = { user: { tenant: { id: 'tenant-2' } } };
			activeTeam = { ...activeTeam, id: 'team-2', tenantId: 'tenant-2', organizationId: 'org-2' };
			teams = [activeTeam];
		});
		view.rerender(<InitState />);
		await act(async () => {
			releaseCancel();
			await cancellationGate;
		});

		expect(mockInvalidateQueries).not.toHaveBeenCalled();
	});

	it('does not refetch the previous workspace scope when token and scope change together', () => {
		resolveWorkspace();
		resolveTeam();
		const view = render(<InitState />);
		mockCancelQueries.mockClear();
		mockInvalidateQueries.mockClear();

		act(() => {
			accessToken = 'token-2';
			user = {
				...user,
				employee: { ...user.employee, tenantId: 'tenant-2', organizationId: 'org-2' }
			};
			currentWorkspace = { user: { tenant: { id: 'tenant-2' } } };
			activeTeam = { ...activeTeam, id: 'team-2', tenantId: 'tenant-2', organizationId: 'org-2' };
			teams = [activeTeam];
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});
		view.rerender(<InitState />);

		expect(mockCancelQueries).not.toHaveBeenCalled();
		expect(mockInvalidateQueries).not.toHaveBeenCalled();
	});
});
