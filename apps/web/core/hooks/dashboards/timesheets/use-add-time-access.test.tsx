/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TUser } from '@/core/types/schemas';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TimesheetPermissions } from './use-timesheets-page';

const mockRolePermissions: { names: string[] } = { names: [] };

jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockRolePermissions.names })
}));

import { useAddTimeAccess } from './use-add-time-access';

const manager = { id: 'user-ada', name: 'Ada Manager', employee: { id: 'employee-ada' } } as TUser;

const teamManager: TimesheetPermissions = {
	hasOrganizationRole: false,
	isManage: true,
	canApprove: false,
	userId: 'user-ada',
	employeeId: 'employee-ada'
};

const admin: TimesheetPermissions = { ...teamManager, hasOrganizationRole: true };

function renderAccess(permissions: TimesheetPermissions, organization: Partial<TOrganization> | null) {
	const store = createStore();
	store.set(currentOrganizationState, organization as TOrganization | null);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => useAddTimeAccess(permissions, manager), { wrapper });
	return result.current;
}

describe('useAddTimeAccess', () => {
	beforeEach(() => {
		mockRolePermissions.names = ['TIME_TRACKER', 'ALLOW_MANUAL_TIME'];
	});

	it('gives a team manager with the manual time permission Add time for themselves only', () => {
		const access = renderAccess(teamManager, { allowManualTime: true });

		expect(access.canAddTime).toBe(true);
		expect(access.fixedMember).toEqual({ employeeId: 'employee-ada', name: 'Ada Manager' });
	});

	it('gives nothing to a team manager whose role lacks the manual time permission', () => {
		mockRolePermissions.names = ['TIME_TRACKER'];
		const access = renderAccess(teamManager, { allowManualTime: true });

		expect(access.canAddTime).toBe(false);
		expect(access.fixedMember).toBeNull();
	});

	it('lets an organization role add time for any member, as before', () => {
		const access = renderAccess(admin, { allowManualTime: true });

		expect(access.canAddTime).toBe(true);
		expect(access.fixedMember).toBeNull();
	});

	it('hides Add time for everyone once the organization turns manual time off', () => {
		expect(renderAccess(teamManager, { allowManualTime: false }).canAddTime).toBe(false);
		expect(renderAccess(admin, { allowManualTime: false }).canAddTime).toBe(false);
	});

	it('leaves the decision to the API while the organization is not known yet', () => {
		expect(renderAccess(teamManager, null).canAddTime).toBe(true);
	});
});
