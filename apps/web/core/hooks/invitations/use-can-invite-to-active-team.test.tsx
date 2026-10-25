/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const OTHER_TEAM_ID = 'team-2';

const signedInUser = { id: 'user-1', employee: { id: 'employee-1', userId: 'user-1' } };
let mockUser: typeof signedInUser | undefined = signedInUser;
const mockPermissions = { myPermissions: [] as string[] };

jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('../roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));

import { useCanInviteToActiveTeam } from './use-can-invite-to-active-team';

type TMembership = Record<string, unknown>;

/** The signed-in user's membership of a team: a plain member unless overridden. */
function ownMembership(overrides: TMembership = {}): TMembership {
	return {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isManager: false,
		role: null,
		...overrides
	};
}

const colleagueManager = {
	id: 'membership-2',
	employeeId: 'employee-2',
	employee: { id: 'employee-2', userId: 'user-2' },
	isManager: true,
	role: null
};

function team(id: string, members: TMembership[], extra: Record<string, unknown> = {}) {
	return { id, name: id, members, ...extra };
}

function canInviteWith(teams: Array<Record<string, unknown>>, activeTeamId: string = TEAM_ID) {
	const store = createStore();
	store.set(organizationTeamsState, teams as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, activeTeamId);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => useCanInviteToActiveTeam(), { wrapper });
	return result.current;
}

describe('useCanInviteToActiveTeam', () => {
	beforeEach(() => {
		mockUser = signedInUser;
		mockPermissions.myPermissions = [];
	});

	it('refuses a plain member of the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership(), colleagueManager]);

		expect(canInviteWith([activeTeam])).toBe(false);
	});

	it('accepts a member flagged as manager of the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership({ isManager: true })]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it.each(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])('accepts the %s team role', (roleName) => {
		const activeTeam = team(TEAM_ID, [ownMembership({ role: { name: roleName } })]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it('finds the membership through the employee user as well', () => {
		const membership = ownMembership({ isManager: true, employee: { id: 'employee-1', user: { id: 'user-1' } } });
		const activeTeam = team(TEAM_ID, [membership]);

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it('accepts the user who created the active team', () => {
		const activeTeam = team(TEAM_ID, [ownMembership()], { createdByUserId: 'user-1' });

		expect(canInviteWith([activeTeam])).toBe(true);
	});

	it.each(['ALL_ORG_VIEW', 'ALL_ORG_EDIT', 'CHANGE_SELECTED_EMPLOYEE'])(
		'accepts a plain member whose role holds %s',
		(permission) => {
			mockPermissions.myPermissions = [permission];
			const activeTeam = team(TEAM_ID, [ownMembership()]);

			expect(canInviteWith([activeTeam])).toBe(true);
		}
	);

	it('does not count a team the user manages when another team is active', () => {
		const activeTeam = team(TEAM_ID, [ownMembership()]);
		const managedTeam = team(OTHER_TEAM_ID, [ownMembership({ isManager: true })]);

		expect(canInviteWith([activeTeam, managedTeam])).toBe(false);
	});

	it('refuses when nobody is signed in', () => {
		mockUser = undefined;
		const activeTeam = team(TEAM_ID, [ownMembership({ isManager: true })], { createdByUserId: 'user-1' });

		expect(canInviteWith([activeTeam])).toBe(false);
	});
});

describe('useCanInviteToActiveTeam on a public team page', () => {
	// The page leaves only the team it shows loaded, while invitations still go to the team of the active team cookie
	const scopedUser = {
		...signedInUser,
		tenantId: 'tenant-1',
		employee: { ...signedInUser.employee, tenantId: 'tenant-1', organizationId: 'organization-1' }
	};
	const ownTeamsKey = queryKeys.organizationTeams.listByScope('tenant-1', 'organization-1', 'user-1');
	const publicTeam = team(OTHER_TEAM_ID, [colleagueManager]);

	function ownTeamList(teams: Array<Record<string, unknown>>) {
		return { data: { items: teams, total: teams.length } };
	}

	/** Renders the hook with the user's own team list cached as the shell caches it, if given. */
	function renderOnPublicTeamPage(ownTeams?: Array<Record<string, unknown>>) {
		const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
		if (ownTeams) {
			const cachedList = ownTeamList(ownTeams);
			queryClient.setQueryData(ownTeamsKey, cachedList);
		}
		const store = createStore();
		store.set(organizationTeamsState, [publicTeam] as unknown as TOrganizationTeam[]);
		store.set(activeTeamIdState, TEAM_ID);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const { result } = renderHook(() => useCanInviteToActiveTeam(), { wrapper });
		return { queryClient, result };
	}

	beforeEach(() => {
		mockUser = scopedUser;
		mockPermissions.myPermissions = [];
		document.cookie = `auth-active-team=${TEAM_ID}; path=/`;
	});

	afterEach(() => {
		document.cookie = 'auth-active-team=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
	});

	it('accepts a manager of the team the invitation goes to, read from their own cached teams', () => {
		const ownTeam = team(TEAM_ID, [ownMembership({ isManager: true })]);
		const { result } = renderOnPublicTeamPage([ownTeam]);

		expect(result.current).toBe(true);
	});

	it('refuses a plain member of that team', () => {
		const ownTeam = team(TEAM_ID, [ownMembership(), colleagueManager]);
		const { result } = renderOnPublicTeamPage([ownTeam]);

		expect(result.current).toBe(false);
	});

	it('keeps the entries until that team is loaded, then judges it', async () => {
		const { queryClient, result } = renderOnPublicTeamPage();

		expect(result.current).toBe(true);

		const ownTeam = team(TEAM_ID, [ownMembership(), colleagueManager]);
		const loadedList = ownTeamList([ownTeam]);
		queryClient.setQueryData(ownTeamsKey, loadedList);

		await waitFor(() => expect(result.current).toBe(false));
	});
});
