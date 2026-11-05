/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { useManagerRightsUnconfirmed } from './use-manager-rights-unconfirmed';

const mockAtomValues: Record<string, unknown> = {};
let mockPermissions: string[] = [];
let mockPermissionsRead = true;

jest.mock('@/core/stores/teams/organization-team', () => ({
	isTeamManagerState: 'manages-team',
	isFlaggedTeamManagerState: 'flagged-manager'
}));
jest.mock('jotai', () => ({ useAtomValue: (atom: string) => mockAtomValues[atom] }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isSuccess: mockPermissionsRead })
}));

/**
 * Ever Teams treats a team's creator or a member with the MANAGER role as its manager, while the API lets a manager
 * act for the members only with the manager flag (or CHANGE_SELECTED_EMPLOYEE). Such a manager saw empty member
 * screens with no reason given.
 */
describe('useManagerRightsUnconfirmed', () => {
	const unconfirmed = () => renderHook(() => useManagerRightsUnconfirmed()).result.current;

	beforeEach(() => {
		mockAtomValues['manages-team'] = true;
		mockAtomValues['flagged-manager'] = false;
		mockPermissions = [];
		mockPermissionsRead = true;
	});

	it('is true for a manager without the flag or CHANGE_SELECTED_EMPLOYEE', () => {
		expect(unconfirmed()).toBe(true);
	});

	it('is false for a flagged manager', () => {
		mockAtomValues['flagged-manager'] = true;

		expect(unconfirmed()).toBe(false);
	});

	it('is false for a holder of CHANGE_SELECTED_EMPLOYEE', () => {
		mockPermissions = ['CHANGE_SELECTED_EMPLOYEE'];

		expect(unconfirmed()).toBe(false);
	});

	it('is false for a member who does not manage the team, and until the permissions are read', () => {
		mockPermissionsRead = false;
		expect(unconfirmed()).toBe(false);

		mockPermissionsRead = true;
		mockAtomValues['manages-team'] = false;
		expect(unconfirmed()).toBe(false);
	});
});
