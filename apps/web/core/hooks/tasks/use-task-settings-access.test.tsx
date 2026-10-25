/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const OTHER_TEAM_ID = 'team-2';

const mockUser = { id: 'user-1', employee: { id: 'employee-1' } };
const mockPermissions = { myPermissions: [] as string[], isSuccess: true };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('../roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));

import { useTaskSettingsAccess } from './use-task-settings-access';

type TMembership = Record<string, unknown>;

/** The user's own membership of a team: a plain, active member unless overridden. */
function ownMembership(overrides: TMembership = {}): TMembership {
	return {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isActive: true,
		isArchived: false,
		isManager: false,
		role: null,
		...overrides
	};
}

const plainMember = ownMembership();
const flaggedManager = ownMembership({ isManager: true });
const managerByRole = ownMembership({ role: { name: 'MANAGER' } });
const adminByRole = ownMembership({ role: { name: 'ADMIN' } });
const inactiveManager = ownMembership({ isManager: true, isActive: false });
const archivedManager = ownMembership({ isManager: true, isArchived: true });
const colleagueManager = ownMembership({
	id: 'membership-2',
	employeeId: 'employee-2',
	employee: { id: 'employee-2', userId: 'user-2' },
	isManager: true
});

function team(id: string, members: TMembership[], extra: Record<string, unknown> = {}) {
	return { id, name: id, members, ...extra };
}

function renderAccess(teams: Array<Record<string, unknown>>, activeTeamId: string | null = TEAM_ID) {
	const store = createStore();
	store.set(organizationTeamsState, teams as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, activeTeamId);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => useTaskSettingsAccess(), { wrapper });
	return result.current;
}

const teamRow = { organizationTeamId: TEAM_ID };
const otherTeamRow = { organizationTeamId: OTHER_TEAM_ID };
const rowOfNoTeam = { organizationTeamId: null };

describe('useTaskSettingsAccess', () => {
	beforeEach(() => {
		mockPermissions.myPermissions = [];
		mockPermissions.isSuccess = true;
	});

	it('lets an ORG_TASK_SETTING holder change every row, a row of no team included', () => {
		mockPermissions.myPermissions = ['ORG_TASK_SETTING'];
		const activeTeam = team(TEAM_ID, [plainMember]);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(true);
		expect(access.canWriteRow(teamRow)).toBe(true);
		expect(access.canWriteRow(rowOfNoTeam)).toBe(true);
		expect(access.canWriteRows([teamRow, rowOfNoTeam])).toBe(true);
	});

	it('lets a manager of the team change the rows of that team, and only those', () => {
		const activeTeam = team(TEAM_ID, [flaggedManager]);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(true);
		expect(access.canWriteRow(teamRow)).toBe(true);
		expect(access.canWriteRows([teamRow, teamRow])).toBe(true);
		expect(access.canWriteRow(rowOfNoTeam)).toBe(false);
		expect(access.canWriteRow(otherTeamRow)).toBe(false);
		expect(access.canWriteRows([teamRow, rowOfNoTeam])).toBe(false);
		expect(access.canWriteRows([])).toBe(false);
	});

	it('reads a missing row of a list as a row of no team instead of throwing', () => {
		const activeTeam = team(TEAM_ID, [flaggedManager]);
		const access = renderAccess([activeTeam]);

		expect(access.canWriteRow(null)).toBe(false);
		expect(access.canWriteRow(undefined)).toBe(false);
		expect(access.canWriteRows([teamRow, null])).toBe(false);
	});

	it('counts the MANAGER role of a membership, the one a team creator gets', () => {
		const activeTeam = team(TEAM_ID, [managerByRole]);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(true);
		expect(access.canWriteRow(teamRow)).toBe(true);
	});

	it('reads the manager memberships of every loaded team, not only the active one', () => {
		const activeTeam = team(TEAM_ID, [plainMember]);
		const managedTeam = team(OTHER_TEAM_ID, [flaggedManager]);
		const access = renderAccess([activeTeam, managedTeam]);

		expect(access.canCreate).toBe(false);
		expect(access.canWriteRow(teamRow)).toBe(false);
		expect(access.canWriteRow(otherTeamRow)).toBe(true);
	});

	it('shows every control read-only to a plain member', () => {
		const activeTeam = team(TEAM_ID, [plainMember]);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(false);
		expect(access.canWriteRow(teamRow)).toBe(false);
		expect(access.canWriteRows([teamRow])).toBe(false);
		expect(access.readOnlyHint).toBe('pages.settingsTeam.TASK_SETTINGS_READ_ONLY');
	});

	it.each([
		['the team creator whose membership is not a manager one', [plainMember], { createdByUserId: 'user-1' }],
		['a membership with the ADMIN role', [adminByRole], {}],
		['an inactive manager membership', [inactiveManager], {}],
		['an archived manager membership', [archivedManager], {}],
		['the manager membership of another employee', [plainMember, colleagueManager], {}]
	])('does not count %s as a manager of the team', (_case, members, extra) => {
		const activeTeam = team(TEAM_ID, members, extra);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(false);
		expect(access.canWriteRow(teamRow)).toBe(false);
	});

	it('locks nothing until the role permissions are known', () => {
		mockPermissions.isSuccess = false;
		const activeTeam = team(TEAM_ID, [plainMember]);
		const access = renderAccess([activeTeam]);

		expect(access.canCreate).toBe(true);
		expect(access.canWriteRow(rowOfNoTeam)).toBe(true);
	});

	it('locks nothing until the active team is loaded', () => {
		const access = renderAccess([], null);

		expect(access.canCreate).toBe(true);
		expect(access.canWriteRow(teamRow)).toBe(true);
	});
});
