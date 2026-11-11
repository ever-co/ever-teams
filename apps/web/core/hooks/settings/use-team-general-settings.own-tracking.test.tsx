/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';

let mockUser: { id: string; role: { name: string } } | null = null;
let mockPermissions: string[] = [];
const mockUpdateMembership = jest.fn();
const mockUpdateEmployee = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/core/lib/helpers/cookies', () => ({ setActiveProjectIdCookie: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-edit-organization-team', () => ({
	useEditOrganizationTeam: () => ({ editOrganizationTeam: jest.fn() })
}));
jest.mock('@/core/hooks/common/use-image-assets', () => ({ useImageAssets: () => ({ createImageAssets: jest.fn() }) }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isSuccess: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployee: mockUpdateMembership })
}));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployeeUpdate: () => ({ updateEmployeeAsync: mockUpdateEmployee })
}));

import { useTeamGeneralSettings } from './use-team-general-settings';

/** The signed-in user's own row, as a manager of the team, with their switch in the team and their own switch. */
function ownManagerRow(userRole: ERoleName, { team = true, employee = true } = {}) {
	return {
		id: 'row-own',
		employeeId: 'employee-own',
		organizationId: 'organization-a',
		tenantId: 'tenant-a',
		isManager: true,
		isTrackingEnabled: team,
		employee: {
			id: 'employee-own',
			userId: 'user-own',
			organizationId: 'organization-a',
			tenantId: 'tenant-a',
			isActive: true,
			isTrackingEnabled: employee,
			user: { id: 'user-own', role: { name: userRole } }
		}
	};
}

function renderSettings(members: unknown[]) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	const team = { id: 'team-a', name: 'Team A', organizationId: 'organization-a', tenantId: 'tenant-a', members };
	store.set(organizationTeamsState, [team] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTeamGeneralSettings(), { wrapper });
}

describe('Team settings: the switch of one’s own tracking (#5015)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUpdateMembership.mockResolvedValue({ affected: 1 });
		mockUpdateEmployee.mockResolvedValue({});
	});

	it('is offered to an admin, who may act on themselves', () => {
		mockUser = { id: 'user-own', role: { name: ERoleName.ADMIN } };
		mockPermissions = ['ORG_EMPLOYEES_EDIT'];

		expect(renderSettings([ownManagerRow(ERoleName.ADMIN)]).result.current.canTurnOwnTracking).toBe(true);
	});

	it('is not offered to a team manager, who waits for an admin', () => {
		mockUser = { id: 'user-own', role: { name: ERoleName.EMPLOYEE } };
		mockPermissions = [];

		expect(renderSettings([ownManagerRow(ERoleName.EMPLOYEE)]).result.current.canTurnOwnTracking).toBe(false);
	});

	it('shows whether the admin can track: their own switch counts, not only the team one', () => {
		mockUser = { id: 'user-own', role: { name: ERoleName.ADMIN } };
		mockPermissions = ['ORG_EMPLOYEES_EDIT'];

		const view = renderSettings([ownManagerRow(ERoleName.ADMIN, { employee: false })]);

		expect(view.result.current.ownTracking).toBe(false);
	});

	it('turns both of the admin’s switches on, as the Members settings do', async () => {
		mockUser = { id: 'user-own', role: { name: ERoleName.ADMIN } };
		mockPermissions = ['ORG_EMPLOYEES_EDIT'];
		const view = renderSettings([ownManagerRow(ERoleName.ADMIN, { employee: false })]);

		await act(() => view.result.current.setOwnTracking(true));

		expect(mockUpdateMembership).toHaveBeenCalledWith('row-own', {
			organizationId: 'organization-a',
			organizationTeamId: 'team-a',
			isTrackingEnabled: true
		});
		expect(mockUpdateEmployee).toHaveBeenCalledWith({
			id: 'employee-own',
			data: expect.objectContaining({ id: 'employee-own', isTrackingEnabled: true })
		});
	});
});
