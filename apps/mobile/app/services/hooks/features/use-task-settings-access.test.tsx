/**
 * Who may change the task settings on mobile: the rule the API enforces on the writes of task statuses, priorities,
 * sizes and versions. A holder of ORG_TASK_SETTING writes every row; anyone else only the rows of a team they manage,
 * through their own active membership flagged `isManager` or holding the MANAGER role. A row of no team needs the
 * permission. Nothing is shown read-only before the permissions and the teams are known.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { getMyRolePermissionsRequest } from '../../client/requests/roles';
import { useTaskSettingsAccess } from './use-task-settings-access';

let mockStores: Record<string, unknown> = {};

jest.mock('../../../models', () => ({
	useStores: () => mockStores
}));

jest.mock('../../../i18n', () => ({
	translate: (key: string) => key
}));

jest.mock('../../client/requests/roles', () => ({
	getMyRolePermissionsRequest: jest.fn()
}));

const mockedPermissionsRequest = getMyRolePermissionsRequest as jest.Mock;

const ACTIVE_TEAM = 'team-active';
const OTHER_TEAM = 'team-other';
const USER = { id: 'user-1', roleId: 'role-1', employee: { id: 'employee-1' } };

const ACTIVE_TEAM_ROW = { organizationTeamId: ACTIVE_TEAM };
const OTHER_TEAM_ROW = { organizationTeamId: OTHER_TEAM };
const DEFAULT_ROW = { organizationTeamId: null };

type TMembership = {
	employeeId: string;
	employee: { userId: string };
	isManager?: boolean | null;
	isActive?: boolean | null;
	isArchived?: boolean | null;
	role?: { name: string } | null;
};

/** The user's own membership of a team: a plain member unless the overrides say otherwise. */
function ownMembership(overrides: Partial<TMembership> = {}): TMembership {
	return { employeeId: 'employee-1', employee: { userId: 'user-1' }, isManager: false, role: null, ...overrides };
}

/** Another employee's membership. */
function colleagueMembership(overrides: Partial<TMembership> = {}): TMembership {
	return { employeeId: 'employee-2', employee: { userId: 'user-2' }, isManager: false, role: null, ...overrides };
}

function givenTeams(activeTeamMembers: TMembership[], otherTeamMembers: TMembership[] = [], user: unknown = USER) {
	const activeTeam = { id: ACTIVE_TEAM, members: activeTeamMembers };
	const otherTeam = { id: OTHER_TEAM, members: otherTeamMembers };
	mockStores = {
		authenticationStore: { authToken: 'token', tenantId: 'tenant-1', user, employeeId: 'employee-1' },
		teamStore: { teams: { items: [activeTeam, otherTeam], total: 2 }, activeTeam, activeTeamId: ACTIVE_TEAM }
	};
}

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ id: permission, roleId: 'role-1', permission, enabled: true }));
}

function newQueryClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function permissionsStatus(client: QueryClient) {
	const [query] = client.getQueryCache().findAll({ queryKey: ['rolePermissions'] });
	return query?.state.status;
}

/** Lets a request answer reach the hook: its promise settles, then the query's batched notification renders it. */
async function answerRequests() {
	await act(async () => {
		await Promise.resolve();
	});
	await act(async () => {
		jest.runOnlyPendingTimers();
	});
}

/** Renders the hook with the role's permissions already read, as they are once any screen has asked for them. */
async function renderWithPermissions(permissions: string[]) {
	const rows = permissionRows(permissions);
	return renderWithRows(rows);
}

/** Renders the hook with these permission rows already read. */
async function renderWithRows(rows: ReturnType<typeof permissionRows>) {
	mockedPermissionsRequest.mockResolvedValue({ data: rows, response: { ok: true, status: 200 } });
	const client = newQueryClient();
	client.setQueryData(['rolePermissions', 'me', 'tenant-1', 'user-1', 'role-1'], rows);
	return renderAccess(client);
}

async function renderAccess(client: QueryClient) {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = await renderHook(() => useTaskSettingsAccess(), { wrapper });
	return result;
}

describe('useTaskSettingsAccess', () => {
	beforeEach(() => {
		mockedPermissionsRequest.mockReset();
	});

	it('shows every control read-only to a member who neither manages the team nor holds the permission', async () => {
		givenTeams([ownMembership(), colleagueMembership({ isManager: true })]);

		const result = await renderWithPermissions(['ORG_TEAM_EDIT']);

		expect(result.current.canCreate).toBe(false);
		expect(result.current.canWriteRow(ACTIVE_TEAM_ROW)).toBe(false);
		expect(result.current.canWriteRow(DEFAULT_ROW)).toBe(false);
		expect(result.current.readOnlyHint).toBe('settingScreen.teamSection.taskSettingsReadOnly');
	});

	it('lets a manager flagged on the membership change the rows of the team only', async () => {
		givenTeams([ownMembership({ isManager: true })]);

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(ACTIVE_TEAM_ROW)).toBe(true);
		expect(result.current.canWriteRow(OTHER_TEAM_ROW)).toBe(false);
		expect(result.current.canWriteRow(DEFAULT_ROW)).toBe(false);
	});

	it('lets a member holding the MANAGER role of the team change its rows, as a team creator does', async () => {
		givenTeams([ownMembership({ role: { name: 'MANAGER' } })]);

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(ACTIVE_TEAM_ROW)).toBe(true);
	});

	it('does not count a manager membership that is inactive or archived', async () => {
		givenTeams(
			[ownMembership({ isManager: true, isActive: false })],
			[ownMembership({ isManager: true, isArchived: true })]
		);

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(false);
		expect(result.current.canWriteRow(OTHER_TEAM_ROW)).toBe(false);
	});

	it('lets a manager of another team change that team rows only', async () => {
		givenTeams([ownMembership()], [ownMembership({ isManager: true })]);

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(false);
		expect(result.current.canWriteRow(OTHER_TEAM_ROW)).toBe(true);
	});

	it('finds the membership by the user when the employee is not loaded', async () => {
		const userWithoutEmployee = { id: 'user-1', roleId: 'role-1' };
		givenTeams([ownMembership({ employeeId: 'employee-9', isManager: true })], [], userWithoutEmployee);

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(true);
	});

	it('lets a holder of ORG_TASK_SETTING change every row, the defaults included', async () => {
		givenTeams([ownMembership()]);

		const result = await renderWithPermissions(['ORG_TASK_SETTING']);

		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(OTHER_TEAM_ROW)).toBe(true);
		expect(result.current.canWriteRow(DEFAULT_ROW)).toBe(true);
	});

	it('does not count an ORG_TASK_SETTING row that is disabled', async () => {
		givenTeams([ownMembership()]);
		const [grantedRow] = permissionRows(['ORG_TASK_SETTING']);
		const disabledRow = { ...grantedRow, enabled: false };

		const result = await renderWithRows([disabledRow]);

		expect(result.current.canCreate).toBe(false);
		expect(result.current.canWriteRow(OTHER_TEAM_ROW)).toBe(false);
		expect(result.current.canWriteRow(DEFAULT_ROW)).toBe(false);
	});

	it('reads the permissions of the signed-in role from the API', async () => {
		givenTeams([ownMembership()]);
		const rows = permissionRows(['ORG_TEAM_EDIT']);
		mockedPermissionsRequest.mockResolvedValue({ data: rows, response: { ok: true, status: 200 } });

		const client = newQueryClient();

		const result = await renderAccess(client);
		await answerRequests();

		expect(mockedPermissionsRequest).toHaveBeenCalledWith({ bearer_token: 'token', tenantId: 'tenant-1' });
		expect(permissionsStatus(client)).toBe('success');
		expect(result.current.canCreate).toBe(false);
	});

	it('shows nothing read-only while the permissions are not known', async () => {
		givenTeams([ownMembership()]);
		mockedPermissionsRequest.mockReturnValue(new Promise(() => undefined));

		const result = await renderAccess(newQueryClient());

		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(DEFAULT_ROW)).toBe(true);
	});

	it('shows nothing read-only when the permissions cannot be read', async () => {
		givenTeams([ownMembership()]);
		mockedPermissionsRequest.mockResolvedValue({ data: { statusCode: 500 }, response: { ok: false, status: 500 } });
		const client = newQueryClient();

		const result = await renderAccess(client);
		await answerRequests();

		expect(permissionsStatus(client)).toBe('error');
		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(ACTIVE_TEAM_ROW)).toBe(true);
	});

	it('shows nothing read-only before the active team is loaded', async () => {
		givenTeams([ownMembership()]);
		mockStores = {
			...mockStores,
			teamStore: { teams: { items: [], total: 0 }, activeTeam: null, activeTeamId: '' }
		};

		const result = await renderWithPermissions([]);

		expect(result.current.canCreate).toBe(true);
		expect(result.current.canWriteRow(ACTIVE_TEAM_ROW)).toBe(true);
	});
});
