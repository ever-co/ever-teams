/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { organizationService } from '@/core/services/client/api/organizations';
import { timerService } from '@/core/services/client/api/timers';
import { useOrganizationDeletion } from './use-organization-deletion';

jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ALL_ORG_EDIT'] })
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ logOut: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-menu-organizations', () => ({
	useTeamMenuOrganizations: () => ({
		data: { current: { id: 'org-trial', name: 'Trial' }, others: [{ id: 'org-real', name: 'Ever Technologies' }] },
		isFetching: false,
		isError: false,
		isSuccess: true,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/hooks/organizations/teams/use-switch-organization', () => ({
	useSwitchOrganization: () => ({ mutateAsync: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', employee: { id: 'employee-1' } } })
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { refreshToken: jest.fn() }
}));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationService: {
		getOrganizationCounts: jest.fn(),
		countWorkspaceOrganizations: jest.fn(),
		softDeleteOrganization: jest.fn()
	}
}));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: { getTimerStatus: jest.fn(), getLastTimerLog: jest.fn() }
}));

const organizations = organizationService as jest.Mocked<typeof organizationService>;
const timer = timerService as jest.Mocked<typeof timerService>;

const ORGANIZATION = { id: 'org-trial', name: 'Trial' };
const COUNTS = { teams: 1, projects: 1, members: 2, trackedSeconds: 3600, invoices: 0, estimates: 0 };
const STOPPED = { data: { running: false, lastLog: { isRunning: false } } };
const ON_BREAK = { data: { running: false, lastLog: { id: 'log-break', isRunning: true, logType: 'BREAK' } } };

function openConfirmation() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useOrganizationDeletion(ORGANIZATION, true), { wrapper });
}

beforeEach(() => {
	jest.clearAllMocks();
	organizations.getOrganizationCounts.mockResolvedValue(COUNTS);
	organizations.countWorkspaceOrganizations.mockResolvedValue(2);
	organizations.softDeleteOrganization.mockResolvedValue(undefined);
	timer.getLastTimerLog.mockResolvedValue({ data: [{ lastLog: { isRunning: false } }] } as never);
});

it("holds the delete while the person's break runs, which this tab's timer state reads as stopped", async () => {
	timer.getTimerStatus.mockResolvedValue(ON_BREAK as never);

	const { result } = openConfirmation();

	await waitFor(() => expect(result.current.status).toBe('ready'));
	expect(result.current.block).toBe('timerRunning');
});

it('holds the delete while work started before midnight runs, which only the last log shows', async () => {
	timer.getTimerStatus.mockResolvedValue(STOPPED as never);
	timer.getLastTimerLog.mockResolvedValue({ data: [{ lastLog: { isRunning: true } }] } as never);

	const { result } = openConfirmation();

	await waitFor(() => expect(result.current.status).toBe('ready'));
	expect(result.current.block).toBe('timerRunning');
});

it('sends no delete for a break taken after the confirmation opened', async () => {
	timer.getTimerStatus.mockResolvedValue(STOPPED as never);
	const { result } = openConfirmation();
	await waitFor(() => expect(result.current.status).toBe('ready'));
	expect(result.current.block).toBeNull();

	timer.getTimerStatus.mockResolvedValue(ON_BREAK as never);
	let refusal: unknown;
	await act(async () => {
		refusal = await result.current.deleteOrganization().catch((error: unknown) => error);
	});

	expect(refusal).toBeInstanceOf(Error);
	expect(organizations.softDeleteOrganization).not.toHaveBeenCalled();
});

it('deletes the organization when no run of the person goes on', async () => {
	timer.getTimerStatus.mockResolvedValue(STOPPED as never);
	const { result } = openConfirmation();
	await waitFor(() => expect(result.current.status).toBe('ready'));

	await act(async () => {
		await result.current.deleteOrganization();
	});

	expect(organizations.softDeleteOrganization).toHaveBeenCalledWith('org-trial');
});
