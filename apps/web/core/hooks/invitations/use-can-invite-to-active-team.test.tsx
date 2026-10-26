/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

// The team rule is the real `useIsMemberManager`: only its inputs (user, active team, permissions) are stubbed.
const mockUser = { id: 'user-1' };
let mockActiveTeam: Record<string, unknown> | null = null;
let mockPermissions: string[] = [];

jest.mock('jotai', () => ({
	useAtomValue: () => mockActiveTeam,
	useSetAtom: () => jest.fn()
}));
jest.mock('@/core/stores', () => ({
	activeTeamState: Symbol('active-team'),
	isTeamManagerState: Symbol('is-team-manager')
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('../roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));

import { useCanInviteToActiveTeam } from './use-can-invite-to-active-team';

function member(userId: string, { isManager = false, role }: { isManager?: boolean; role?: string } = {}) {
	return { employee: { userId }, isManager, role: role ? { name: role } : undefined };
}

function team(members: unknown[], createdByUserId = 'someone-else') {
	return { id: 'team-1', createdByUserId, members };
}

const canInvite = () => renderHook(() => useCanInviteToActiveTeam()).result.current;

describe('useCanInviteToActiveTeam', () => {
	beforeEach(() => {
		mockActiveTeam = null;
		mockPermissions = [];
	});

	it('lets a team manager invite', () => {
		mockActiveTeam = team([member('user-1', { isManager: true }), member('user-2')]);

		expect(canInvite()).toBe(true);
	});

	it.each(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])('lets a member whose team role is %s invite', (role) => {
		mockActiveTeam = team([member('user-1', { role })]);

		expect(canInvite()).toBe(true);
	});

	it('lets the team creator invite without a manager membership', () => {
		mockActiveTeam = team([member('user-1')], 'user-1');

		expect(canInvite()).toBe(true);
	});

	it.each(['ALL_ORG_EDIT', 'ALL_ORG_VIEW', 'CHANGE_SELECTED_EMPLOYEE'])(
		'lets a plain member holding %s invite',
		(permission) => {
			mockActiveTeam = team([member('user-1')]);
			mockPermissions = ['ORG_TASK_VIEW', permission];

			expect(canInvite()).toBe(true);
		}
	);

	it('hides the invite from a plain member, even beside a manager of the team', () => {
		mockActiveTeam = team([member('user-1', { role: 'EMPLOYEE' }), member('user-2', { isManager: true })]);
		mockPermissions = ['ORG_INVITE_EDIT', 'ORG_TASK_VIEW'];

		expect(canInvite()).toBe(false);
	});

	it('hides the invite while no team is active and no organization-wide permission is held', () => {
		expect(canInvite()).toBe(false);
	});
});
