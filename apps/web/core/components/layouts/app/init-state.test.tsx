/** @jest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';

type Action = jest.Mock<void, []>;

let mockFastAppBootstrap = false;
let mockUser: unknown = { id: 'user-1' };
const mockPublicTeam = { id: 'public-team' };
const mockLegacyOwnerCalls: string[] = [];
const mockStartupCallOrder: string[] = [];
const mockRefreshIntervalCalls: Array<[string, number, unknown?]> = [];
const mockTeamRefreshIntervalCalls: Array<[string, number, unknown?]> = [];
const mockYearTimeLogRequest = jest.fn();

function mockOwner<T>(name: string, value: T): T {
	mockLegacyOwnerCalls.push(name);
	return value;
}

function mockAction(name: string): Action {
	return jest.fn(() => {
		mockStartupCallOrder.push(name);
	});
}

const mockFirstLoadWorkspacesData = mockAction('firstLoadWorkspacesData');
const mockFirstLoadTeamsData = mockAction('firstLoadTeamsData');
const mockFirstLoadTasksData = mockAction('firstLoadTasksData');
const mockFirstLoadTeamInvitationsData = mockAction('firstLoadTeamInvitationsData');
const mockFirstLoadTimerData = mockAction('firstLoadTimerData');
const mockFirstLoadtasksStatisticsData = mockAction('firstLoadtasksStatisticsData');
const mockFirstLoadLanguagesData = mockAction('firstLoadLanguagesData');
const mockFirstLoadAutoAssignTask = mockAction('firstLoadAutoAssignTask');
const mockFirstLoadOrganizationProjectsData = mockAction('firstLoadOrganizationProjectsData');
const mockFirstLoadTaskStatusesData = mockAction('firstLoadTaskStatusesData');
const mockFirstLoadTaskVersionData = mockAction('firstLoadTaskVersionData');
const mockFirstLoadTaskPrioritiesData = mockAction('firstLoadTaskPrioritiesData');
const mockFirstLoadTaskSizesData = mockAction('firstLoadTaskSizesData');
const mockFirstLoadTaskLabelsData = mockAction('firstLoadTaskLabelsData');
const mockFirstLoadIssueTypeData = mockAction('firstLoadIssueTypeData');
const mockFirstLoadTaskRelatedIssueTypeData = mockAction('firstLoadTaskRelatedIssueTypeData');
const mockFirstLoadMyDailyPlans = mockAction('firstLoadMyDailyPlans');
const mockFirstLoadTeamDailyPlans = mockAction('firstLoadTeamDailyPlans');
const mockFirstLoadDataEmployee = mockAction('firstLoadDataEmployee');
const mockFirstLoadRolesData = mockAction('firstLoadRolesData');
const mockFirstLoadMyRolePermissionsData = mockAction('firstLoadMyRolePermissionsData');
const mockFirstLoadCurrenciesData = mockAction('firstLoadCurrenciesData');
const mockGetTimerStatus = mockAction('getTimerStatus').mockName('getTimerStatus');
const mockLoadTeamsData = mockAction('loadTeamsData').mockName('loadTeamsData');
const mockLoadLanguagesData = mockAction('loadLanguagesData').mockName('loadLanguagesData');
const mockTimeToTimeRefreshToken = mockAction('timeToTimeRefreshToken');
const mockLoadTeamTasksData = jest.fn().mockName('loadTeamTasksData');
const mockRefetchMyInvitations = jest.fn().mockName('refetchMyInvitations');
const mockLoadTaskStatusesData = jest.fn().mockName('loadTaskStatusesData');
const mockLoadTaskPriorities = jest.fn().mockName('loadTaskPriorities');
const mockLoadTaskSizes = jest.fn().mockName('loadTaskSizes');
const mockLoadTaskLabels = jest.fn().mockName('loadTaskLabels');
const mockLoadTaskRelatedIssueTypeData = jest.fn().mockName('loadTaskRelatedIssueTypeData');
const mockLoadTaskVersionData = jest.fn().mockName('loadTaskVersionData');
const mockLoadAllDayPlans = jest.fn().mockName('loadAllDayPlans');
const mockLoadMyDailyPlans = jest.fn().mockName('loadMyDailyPlans');
const mockValidateCurrentOrgAccess = jest.fn(async () => ({ isValid: true }));
const mockHandleOrgBranching = jest.fn(() => ({ action: 'keep-current' }));

const mockUseUserQuery = jest.fn(() => ({ data: mockUser }));
const mockUseOrganizationTeamsQuery = jest.fn(() =>
	mockOwner('useOrganizationTeamsQuery', {
		loadTeamsData: mockLoadTeamsData,
		firstLoadTeamsData: mockFirstLoadTeamsData,
		teams: [],
		activeTeam: null,
		organizationTeamsSuccess: false,
		organizationTeamSuccess: false
	})
);
const mockUseTeamTasksQuery = jest.fn(() =>
	mockOwner('useTeamTasksQuery', {
		firstLoadTasksData: mockFirstLoadTasksData,
		loadTeamTasksData: mockLoadTeamTasksData,
		activeTeamTask: null,
		querySuccess: false
	})
);
const mockUseTeamInvitationsQuery = jest.fn(() =>
	mockOwner('useTeamInvitationsQuery', { firstLoadTeamInvitationsData: mockFirstLoadTeamInvitationsData })
);
const mockUseMyInvitationsQuery = jest.fn(() =>
	mockOwner('useMyInvitationsQuery', { refetchMyInvitations: mockRefetchMyInvitations })
);
const mockUseTimer = jest.fn(() =>
	mockOwner('useTimer', {
		getTimerStatus: mockGetTimerStatus,
		firstLoadTimerData: mockFirstLoadTimerData,
		rawTimerRunning: false,
		statusResolved: false,
		plansResolved: false,
		syncTimer: jest.fn()
	})
);
const mockUseTaskStatistics = jest.fn(() =>
	mockOwner('useTaskStatistics', { firstLoadtasksStatisticsData: mockFirstLoadtasksStatisticsData })
);
const mockUseLanguageSettings = jest.fn(() =>
	mockOwner('useLanguageSettings', {
		loadLanguagesData: mockLoadLanguagesData,
		firstLoadLanguagesData: mockFirstLoadLanguagesData
	})
);
const mockUseOrganizationProjectsQuery = jest.fn(() =>
	mockOwner('useOrganizationProjectsQuery', {
		firstLoadOrganizationProjectsData: mockFirstLoadOrganizationProjectsData
	})
);
const mockUseAutoAssignTask = jest.fn(() =>
	mockOwner('useAutoAssignTask', { firstLoadData: mockFirstLoadAutoAssignTask })
);
const mockUseInvalidateRoles = jest.fn(() =>
	mockOwner('useInvalidateRoles', { invalidateRoles: mockFirstLoadRolesData })
);
const mockUseTaskStatusesQuery = jest.fn(() =>
	mockOwner('useTaskStatusesQuery', {
		firstLoadTaskStatusesData: mockFirstLoadTaskStatusesData,
		loadTaskStatuses: mockLoadTaskStatusesData
	})
);
const mockUseInvalidateRolePermissions = jest.fn(() =>
	mockOwner('useInvalidateRolePermissions', {
		invalidateMyRolePermissions: mockFirstLoadMyRolePermissionsData
	})
);
const mockUseCurrencies = jest.fn(() =>
	mockOwner('useCurrencies', { firstLoadCurrenciesData: mockFirstLoadCurrenciesData })
);
const mockUseAuthenticateUser = jest.fn(() =>
	mockOwner('useAuthenticateUser', { timeToTimeRefreshToken: mockTimeToTimeRefreshToken })
);
const mockUseWorkspaces = jest.fn(() =>
	mockOwner('useWorkspaces', {
		firstLoadWorkspacesData: mockFirstLoadWorkspacesData,
		currentWorkspace: null,
		workspacesQuery: { isSuccess: false }
	})
);
const mockUseCurrentOrg = jest.fn(() =>
	mockOwner('useCurrentOrg', {
		validateCurrentOrgAccess: mockValidateCurrentOrgAccess,
		handleOrgBranching: mockHandleOrgBranching
	})
);
const mockUseTaskVersionsQuery = jest.fn(() =>
	mockOwner('useTaskVersionsQuery', {
		firstLoadTaskVersionData: mockFirstLoadTaskVersionData,
		loadTaskVersionData: mockLoadTaskVersionData
	})
);
const mockUseTaskPrioritiesQuery = jest.fn(() =>
	mockOwner('useTaskPrioritiesQuery', {
		firstLoadTaskPrioritiesData: mockFirstLoadTaskPrioritiesData,
		loadTaskPriorities: mockLoadTaskPriorities
	})
);
const mockUseTaskSizesQuery = jest.fn(() =>
	mockOwner('useTaskSizesQuery', {
		firstLoadTaskSizesData: mockFirstLoadTaskSizesData,
		loadTaskSizes: mockLoadTaskSizes
	})
);
const mockUseTaskLabelsQuery = jest.fn(() =>
	mockOwner('useTaskLabelsQuery', {
		firstLoadTaskLabelsData: mockFirstLoadTaskLabelsData,
		loadTaskLabels: mockLoadTaskLabels
	})
);
const mockUseIssueTypesQuery = jest.fn(() =>
	mockOwner('useIssueTypesQuery', { firstLoadIssueTypeData: mockFirstLoadIssueTypeData })
);
const mockUseTaskRelatedIssueTypesQuery = jest.fn(() =>
	mockOwner('useTaskRelatedIssueTypesQuery', {
		firstLoadTaskRelatedIssueTypeData: mockFirstLoadTaskRelatedIssueTypeData,
		loadTaskRelatedIssueTypeData: mockLoadTaskRelatedIssueTypeData
	})
);
const mockUseMyDailyPlans = jest.fn(() =>
	mockOwner('useMyDailyPlans', {
		firstLoadMyDailyPlans: mockFirstLoadMyDailyPlans,
		loadMyDailyPlans: mockLoadMyDailyPlans
	})
);
const mockUseTeamDailyPlans = jest.fn(() =>
	mockOwner('useTeamDailyPlans', {
		firstLoadTeamDailyPlans: mockFirstLoadTeamDailyPlans,
		loadAllDayPlans: mockLoadAllDayPlans
	})
);
const mockUseEmployee = jest.fn(() => mockOwner('useEmployee', { firstLoadDataEmployee: mockFirstLoadDataEmployee }));
const mockUseTimeLogsDailyReport = jest.fn(() => mockOwner('useTimeLogsDailyReport', undefined));
const mockUseTimeLogs = jest.fn(() => {
	mockOwner('useTimeLogs', undefined);
	if (process.env.NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS === 'true') {
		mockYearTimeLogRequest();
	}
});
const mockUseGetCurrentOrganization = jest.fn(() => mockOwner('useGetCurrentOrganization', undefined));
const mockUseSyncTimer = jest.fn(() => mockOwner('useSyncTimer', undefined));
const mockUseTimerPolling = jest.fn();
const mockUseScopeTransitionGuard = jest.fn();
const mockCancelQueries = jest.fn(() => Promise.resolve());
const mockInvalidateQueries = jest.fn(() => Promise.resolve());

jest.mock('@/core/constants/config/constants', () => ({
	DISABLE_AUTO_REFRESH: { value: false },
	FAST_APP_BOOTSTRAP: {
		get value() {
			return mockFastAppBootstrap;
		}
	}
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: mockUseUserQuery }));
jest.mock('@/core/stores', () => ({ publicState: Symbol('publicState') }));
jest.mock('jotai', () => ({ useAtomValue: () => mockPublicTeam }));
jest.mock('@/core/hooks/activities/time-logs/use-time-logs-daily-report', () => ({
	useTimeLogsDailyReport: mockUseTimeLogsDailyReport
}));
jest.mock('@/core/hooks/activities/time-logs/use-time-logs', () => ({ useTimeLogs: mockUseTimeLogs }));
jest.mock('@/core/hooks/activities', () => ({ useTimer: mockUseTimer, useSyncTimer: mockUseSyncTimer }));
jest.mock('@/core/hooks/activities/use-timer-polling', () => ({ useTimerPolling: mockUseTimerPolling }));
jest.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ cancelQueries: mockCancelQueries, invalidateQueries: mockInvalidateQueries })
}));
jest.mock('./use-scope-transition-guard', () => ({
	useScopeTransitionGuard: mockUseScopeTransitionGuard,
	getFastShellCriticalQueryKeys: () => []
}));
jest.mock('@/core/hooks/common', () => ({
	useLanguageSettings: mockUseLanguageSettings,
	useCallbackRef: (func: () => void) => ({ current: func }),
	useRefreshIntervalV2: (callback: jest.Mock, interval: number, parameter?: unknown) => {
		mockRefreshIntervalCalls.push([callback.getMockName(), interval, parameter]);
	},
	useOTRefreshInterval: (callback: jest.Mock, interval: number, parameter?: unknown) => {
		mockTeamRefreshIntervalCalls.push([callback.getMockName(), interval, parameter]);
	}
}));
jest.mock('@/core/hooks/common/use-currencies', () => ({ useCurrencies: mockUseCurrencies }));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({ useMyDailyPlans: mockUseMyDailyPlans }));
jest.mock('@/core/hooks/daily-plans/use-team-daily-plans', () => ({ useTeamDailyPlans: mockUseTeamDailyPlans }));
jest.mock('@/core/hooks/organizations', () => ({
	useOrganizationTeamsQuery: mockUseOrganizationTeamsQuery,
	useTeamTasksQuery: mockUseTeamTasksQuery,
	useOrganizationProjectsQuery: mockUseOrganizationProjectsQuery,
	useEmployee: mockUseEmployee
}));
jest.mock('@/core/hooks/invitations/use-team-invitations-query', () => ({
	useTeamInvitationsQuery: mockUseTeamInvitationsQuery
}));
jest.mock('@/core/hooks/invitations/use-my-invitations-query', () => ({
	useMyInvitationsQuery: mockUseMyInvitationsQuery
}));
jest.mock('@/core/hooks/auth', () => ({
	useWorkspaces: mockUseWorkspaces,
	useCurrentOrg: mockUseCurrentOrg,
	useAuthenticateUser: mockUseAuthenticateUser
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: mockUseGetCurrentOrganization
}));
jest.mock('@/core/hooks/roles/use-invalidate-roles', () => ({ useInvalidateRoles: mockUseInvalidateRoles }));
jest.mock('@/core/hooks/roles/use-invalidate-role-permissions', () => ({
	useInvalidateRolePermissions: mockUseInvalidateRolePermissions
}));
jest.mock('@/core/hooks/tasks', () => ({
	useTaskStatistics: mockUseTaskStatistics,
	useAutoAssignTask: mockUseAutoAssignTask
}));
jest.mock('@/core/hooks/tasks/use-task-versions-query', () => ({ useTaskVersionsQuery: mockUseTaskVersionsQuery }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: mockUseTaskStatusesQuery }));
jest.mock('@/core/hooks/tasks/use-task-sizes-query', () => ({ useTaskSizesQuery: mockUseTaskSizesQuery }));
jest.mock('@/core/hooks/tasks/use-task-priorities-query', () => ({
	useTaskPrioritiesQuery: mockUseTaskPrioritiesQuery
}));
jest.mock('@/core/hooks/tasks/use-task-labels-query', () => ({ useTaskLabelsQuery: mockUseTaskLabelsQuery }));
jest.mock('@/core/hooks/tasks/use-issue-types-query', () => ({ useIssueTypesQuery: mockUseIssueTypesQuery }));
jest.mock('@/core/hooks/tasks/use-task-related-issue-types-query', () => ({
	useTaskRelatedIssueTypesQuery: mockUseTaskRelatedIssueTypesQuery
}));

// Loaded after the mocks so the focused RED is the missing Task 5 modules/flag, not legacy dependencies.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppState } = require('./init-state') as typeof import('./init-state');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LegacyInitState } = require('./legacy-init-state') as typeof import('./legacy-init-state');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FastInitState } = require('./fast-init-state') as typeof import('./fast-init-state');

const legacyOwners = [
	'useOrganizationTeamsQuery',
	'useTeamTasksQuery',
	'useTeamInvitationsQuery',
	'useMyInvitationsQuery',
	'useTimer',
	'useTaskStatistics',
	'useLanguageSettings',
	'useOrganizationProjectsQuery',
	'useAutoAssignTask',
	'useInvalidateRoles',
	'useTaskStatusesQuery',
	'useInvalidateRolePermissions',
	'useCurrencies',
	'useAuthenticateUser',
	'useWorkspaces',
	'useCurrentOrg',
	'useTaskVersionsQuery',
	'useTaskPrioritiesQuery',
	'useTaskSizesQuery',
	'useTaskLabelsQuery',
	'useIssueTypesQuery',
	'useTaskRelatedIssueTypesQuery',
	'useMyDailyPlans',
	'useTeamDailyPlans',
	'useEmployee',
	'useTimeLogsDailyReport',
	'useTimeLogs',
	'useGetCurrentOrganization',
	'useSyncTimer'
] as const;

const fastOwners = [
	'useTimeLogs',
	'useWorkspaces',
	'useOrganizationTeamsQuery',
	'useTeamTasksQuery',
	'useTimer',
	'useAutoAssignTask',
	'useTaskStatistics'
] as const;

describe('AppState startup transport selector', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		mockFastAppBootstrap = false;
		mockUser = { id: 'user-1' };
		process.env.NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS = 'false';
		mockLegacyOwnerCalls.length = 0;
		mockStartupCallOrder.length = 0;
		mockRefreshIntervalCalls.length = 0;
		mockTeamRefreshIntervalCalls.length = 0;
	});

	afterEach(() => {
		cleanup();
		jest.useRealTimers();
	});

	it.each([undefined, null, false, 0, ''])(
		'keeps both startup branches behind the existing truthy user gate (%p)',
		(user) => {
			mockUser = user;

			render(<AppState />);

			expect(mockUseUserQuery).toHaveBeenCalledTimes(1);
			expect(mockLegacyOwnerCalls).toEqual([]);
			expect(mockUseTimeLogs).not.toHaveBeenCalled();
			expect(mockStartupCallOrder).toEqual([]);
		}
	);

	it.each([
		[false, false, legacyOwners, 0],
		[false, true, legacyOwners, 1],
		[true, false, fastOwners, 0],
		[true, true, fastOwners, 1]
	] as const)(
		'selects one startup owner for fast=%s and year=%s',
		(fastEnabled, yearlyEnabled, expectedOwners, expectedYearRequests) => {
			mockFastAppBootstrap = fastEnabled;
			process.env.NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS = String(yearlyEnabled);

			render(<AppState />);

			expect(mockLegacyOwnerCalls).toEqual(expectedOwners);
			expect(mockUseTimeLogs).toHaveBeenCalledTimes(1);
			expect(mockYearTimeLogRequest).toHaveBeenCalledTimes(expectedYearRequests);
			expect(mockUseGetCurrentOrganization).toHaveBeenCalledTimes(fastEnabled ? 0 : 1);
		}
	);

	it('preserves the exact legacy owner, first-load, refresh, and validation manifests', async () => {
		expect(LegacyInitState).toBeDefined();
		render(<AppState />);

		expect(mockLegacyOwnerCalls).toEqual(legacyOwners);
		expect(mockStartupCallOrder).toEqual([
			'firstLoadWorkspacesData',
			'firstLoadTeamsData',
			'firstLoadTasksData',
			'firstLoadTeamInvitationsData',
			'firstLoadTimerData',
			'firstLoadtasksStatisticsData',
			'firstLoadLanguagesData',
			'firstLoadAutoAssignTask',
			'firstLoadOrganizationProjectsData',
			'firstLoadTaskStatusesData',
			'firstLoadTaskVersionData',
			'firstLoadTaskPrioritiesData',
			'firstLoadTaskSizesData',
			'firstLoadTaskLabelsData',
			'firstLoadIssueTypeData',
			'firstLoadTaskRelatedIssueTypeData',
			'firstLoadMyDailyPlans',
			'firstLoadTeamDailyPlans',
			'firstLoadDataEmployee',
			'firstLoadRolesData',
			'firstLoadMyRolePermissionsData',
			'firstLoadCurrenciesData',
			'getTimerStatus',
			'loadTeamsData',
			'loadLanguagesData',
			'timeToTimeRefreshToken'
		]);
		expect(mockRefreshIntervalCalls).toEqual([
			['getTimerStatus', 60_000, undefined],
			['loadTeamTasksData', 60_000, true],
			['refetchMyInvitations', 60_000, true],
			['loadTaskStatusesData', 300_000, true],
			['loadTaskPriorities', 300_000, true],
			['loadTaskSizes', 300_000, true],
			['loadTaskLabels', 300_000, true],
			['loadTaskRelatedIssueTypeData', 300_000, true],
			['loadTaskVersionData', 300_000, true],
			['loadAllDayPlans', 300_000, true],
			['loadMyDailyPlans', 300_000, true]
		]);
		expect(mockTeamRefreshIntervalCalls).toEqual([['loadTeamsData', 60_000, mockPublicTeam]]);

		act(() => {
			jest.advanceTimersByTime(1999);
		});
		expect(mockValidateCurrentOrgAccess).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(1);
			await Promise.resolve();
		});
		expect(mockValidateCurrentOrgAccess).toHaveBeenCalledTimes(1);
		expect(mockHandleOrgBranching).toHaveBeenCalledTimes(1);
	});

	it('keeps default-false metadata, monthly report, organization profile, calendar, and workspace rollback owners', () => {
		render(<AppState />);

		expect(
			[
				mockUseTaskStatusesQuery,
				mockUseTaskPrioritiesQuery,
				mockUseTaskSizesQuery,
				mockUseTaskLabelsQuery,
				mockUseTaskVersionsQuery,
				mockUseIssueTypesQuery,
				mockUseTaskRelatedIssueTypesQuery
			].every((owner) => owner.mock.calls.length === 1)
		).toBe(true);
		expect(mockUseTimeLogsDailyReport).toHaveBeenCalledTimes(1);
		expect(mockUseGetCurrentOrganization).toHaveBeenCalledTimes(1);
		expect(mockUseMyDailyPlans).toHaveBeenCalledTimes(1);
		expect(mockUseTeamDailyPlans).toHaveBeenCalledTimes(1);
		expect(mockUseWorkspaces).toHaveBeenCalledTimes(1);
		expect(mockFirstLoadWorkspacesData).toHaveBeenCalledTimes(1);
	});

	it('keeps fast startup limited to dependency-gated shell owners', () => {
		mockFastAppBootstrap = true;
		expect(FastInitState).toBeDefined();

		render(<AppState />);

		expect(mockLegacyOwnerCalls).toEqual(fastOwners);
		expect(mockStartupCallOrder).toEqual([]);
		expect(mockRefreshIntervalCalls).toEqual([]);
		expect(mockTeamRefreshIntervalCalls).toEqual([]);
		expect(mockUseTimeLogsDailyReport).not.toHaveBeenCalled();
		expect(mockUseGetCurrentOrganization).not.toHaveBeenCalled();
		expect(mockUseWorkspaces).toHaveBeenCalledTimes(1);
		expect(mockUseTimer).toHaveBeenCalledTimes(1);
		expect(mockUseSyncTimer).not.toHaveBeenCalled();
	});
});

describe('FAST_APP_BOOTSTRAP environment contract', () => {
	const originalValue = process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP;

	afterAll(() => {
		if (originalValue === undefined) {
			delete process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP;
		} else {
			process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP = originalValue;
		}
	});

	it.each([
		[undefined, false],
		['', false],
		['false', false],
		['TRUE', false],
		[' true ', false],
		['1', false],
		['true', true]
	] as const)('maps %p to %s', (value, expected) => {
		jest.resetModules();
		if (value === undefined) {
			delete process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP;
		} else {
			process.env.NEXT_PUBLIC_FAST_APP_BOOTSTRAP = value;
		}

		const { FAST_APP_BOOTSTRAP } = jest.requireActual(
			'@/core/constants/config/constants'
		) as typeof import('@/core/constants/config/constants');

		expect(FAST_APP_BOOTSTRAP.value).toBe(expected);
	});
});
