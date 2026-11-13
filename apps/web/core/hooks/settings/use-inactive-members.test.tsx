/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { WorkEndNotAppliedError } from '@/core/lib/utils/member-access';

const mockGetInactiveEmployees = jest.fn();
const mockSetMemberWorkEnd = jest.fn();
let mockPermissions: string[] = [];

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) => `${key}:${values?.name ?? ''}`
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/services/client/api/organizations/teams', () => ({
	employeeService: { getInactiveEmployees: (...args: unknown[]) => mockGetInactiveEmployees(...args) }
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));
jest.mock('./use-member-access', () => ({
	useMemberWorkEnd: () => ({ setMemberWorkEnd: mockSetMemberWorkEnd })
}));

import { useInactiveMembers } from './use-inactive-members';

const mockToast = (jest.requireMock('sonner') as { toast: { success: jest.Mock; error: jest.Mock } }).toast;

const TEAM = { id: 'team-a', name: 'Team A', organizationId: 'organization-1', tenantId: 'tenant-1', members: [] };

const ANA = {
	id: 'employee-ana',
	fullName: 'Ana Lima',
	endWork: '2026-11-05T09:00:00.000Z',
	user: { email: 'ana@example.com' },
	teams: [{ organizationTeamId: 'team-a' }]
};
const BO = { ...ANA, id: 'employee-bo', fullName: 'Bo Chen', teams: [{ organizationTeamId: 'team-b' }] };

function renderInactiveMembers(isShown: boolean) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(organizationTeamsState, [TEAM] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useInactiveMembers(isShown), { wrapper });
}

beforeEach(() => {
	jest.clearAllMocks();
	mockPermissions = ['ORG_EMPLOYEES_VIEW', 'ORG_EMPLOYEES_EDIT'];
	mockGetInactiveEmployees.mockResolvedValue([ANA, BO]);
});

describe('the inactive members of the active team', () => {
	it('asks the API nothing while the list is not shown', () => {
		const view = renderInactiveMembers(false);

		expect(mockGetInactiveEmployees).not.toHaveBeenCalled();
		expect(view.result.current.isLoading).toBe(false);
	});

	it('asks the API nothing for a viewer without ORG_EMPLOYEES_VIEW, who would be refused', () => {
		mockPermissions = ['ORG_TEAM_EDIT'];

		const view = renderInactiveMembers(true);

		expect(mockGetInactiveEmployees).not.toHaveBeenCalled();
		expect(view.result.current.canList).toBe(false);
		expect(view.result.current.canRestore).toBe(false);
	});

	it("reads the organization's inactive employees and keeps those of the team", async () => {
		const view = renderInactiveMembers(true);

		expect(view.result.current.isLoading).toBe(true);
		await waitFor(() => expect(view.result.current.members).toHaveLength(1));

		expect(mockGetInactiveEmployees).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'organization-1', tenantId: 'tenant-1' })
		);
		expect(view.result.current.members[0]).toMatchObject({ employeeId: 'employee-ana', name: 'Ana Lima' });
		expect(view.result.current.isLoading).toBe(false);
	});

	it('says the list could not be read when the API refuses it', async () => {
		mockGetInactiveEmployees.mockRejectedValue({ status: 500 });

		const view = renderInactiveMembers(true);

		await waitFor(() => expect(view.result.current.isError).toBe(true));
		expect(view.result.current.isLoading).toBe(false);
	});

	it('says so when the list could not be read again, instead of showing the earlier answer as current', async () => {
		const view = renderInactiveMembers(true);
		await waitFor(() => expect(view.result.current.members).toHaveLength(1));
		mockGetInactiveEmployees.mockRejectedValue({ status: 500 });

		await act(async () => {
			await view.result.current.retry();
		});

		await waitFor(() => expect(view.result.current.isError).toBe(true));
		expect(view.result.current.isLoading).toBe(false);
	});

	it('lets a viewer who only reads employees see the list without restoring', async () => {
		mockPermissions = ['ORG_EMPLOYEES_VIEW'];

		const view = renderInactiveMembers(true);

		await waitFor(() => expect(view.result.current.members).toHaveLength(1));
		expect(view.result.current.canRestore).toBe(false);
	});
});

describe('restoring a member', () => {
	it('clears the end of work of the employee in the team organization and says so', async () => {
		mockSetMemberWorkEnd.mockResolvedValue(undefined);
		const view = renderInactiveMembers(true);
		await waitFor(() => expect(view.result.current.members).toHaveLength(1));

		await act(() => view.result.current.restore(view.result.current.members[0]));

		expect(mockSetMemberWorkEnd).toHaveBeenCalledWith({
			employeeId: 'employee-ana',
			organizationId: 'organization-1',
			tenantId: 'tenant-1',
			endWork: null
		});
		expect(mockToast.success).toHaveBeenCalledWith('settings.members.RESTORED:Ana Lima');
		expect(view.result.current.busyIds.has('employee-ana')).toBe(false);
	});

	it('says why when the API refuses the restoration', async () => {
		mockSetMemberWorkEnd.mockRejectedValue({ status: 403 });
		const view = renderInactiveMembers(true);
		await waitFor(() => expect(view.result.current.members).toHaveLength(1));

		await act(() => view.result.current.restore(view.result.current.members[0]));

		expect(mockToast.success).not.toHaveBeenCalled();
		expect(mockToast.error).toHaveBeenCalledWith('settings.members.RESTORE_FAILED:Ana Lima', {
			description: 'toasts.REASONS.PERMISSION:'
		});
	});

	it('never says a member is back when the API left them deactivated', async () => {
		mockSetMemberWorkEnd.mockRejectedValue(new WorkEndNotAppliedError());
		const view = renderInactiveMembers(true);
		await waitFor(() => expect(view.result.current.members).toHaveLength(1));

		await act(() => view.result.current.restore(view.result.current.members[0]));

		expect(mockToast.success).not.toHaveBeenCalled();
		expect(mockToast.error).toHaveBeenCalledWith('settings.members.RESTORE_FAILED:Ana Lima', {
			description: 'toasts.REASONS.SERVER:'
		});
	});
});
