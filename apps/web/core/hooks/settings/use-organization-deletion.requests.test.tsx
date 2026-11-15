/** @jest-environment jsdom */

/**
 * The requests behind the organizations to land in after a delete, with the team menu's real query: none while the
 * Workspace settings show the confirmation closed, one as it opens (the refetch joins the read the opening starts),
 * and a fresh one as it opens over what the team menu cached up to ten minutes before.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { organizationService } from '@/core/services/client/api/organizations';
import { timerService } from '@/core/services/client/api/timers';
import { useOrganizationDeletion } from './use-organization-deletion';

const mockGetTeamMenuOrganizations = jest.fn();

jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ALL_ORG_EDIT'] })
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ logOut: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/teams/use-switch-organization', () => ({
	useSwitchOrganization: () => ({ mutateAsync: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-1',
			tenantId: 'tenant-1',
			role: { name: 'EMPLOYEE' },
			employee: { id: 'employee-1', tenantId: 'tenant-1', organizationId: 'org-trial' }
		}
	})
}));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'access-token'
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'org-trial'
}));
jest.mock('@/core/services/client/api/organizations/teams/team-menu-organizations.service', () => ({
	teamMenuOrganizationsService: {
		getTeamMenuOrganizations: (...args: unknown[]) => mockGetTeamMenuOrganizations(...args)
	}
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
const MENU = { current: { id: 'org-trial', name: 'Trial' }, others: [{ id: 'org-real', name: 'Ever Technologies' }] };

function renderDeletion(client: QueryClient) {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(({ isConfirmOpen }) => useOrganizationDeletion(ORGANIZATION, isConfirmOpen), {
		wrapper,
		initialProps: { isConfirmOpen: false }
	});
}

function newClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Lets the effects and the query observers run, so a request that would start has started. */
async function settle() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	organizations.getOrganizationCounts.mockResolvedValue({
		teams: 1,
		projects: 1,
		members: 2,
		trackedSeconds: 3600,
		invoices: 0,
		estimates: 0
	} as never);
	organizations.countWorkspaceOrganizations.mockResolvedValue(2);
	timer.getTimerStatus.mockResolvedValue({ data: { running: false, lastLog: { isRunning: false } } } as never);
	timer.getLastTimerLog.mockResolvedValue({ data: [{ lastLog: { isRunning: false } }] } as never);
});

it('reads nothing while the confirmation is closed, and one request as it opens', async () => {
	let answer: (value: typeof MENU) => void = () => undefined;
	mockGetTeamMenuOrganizations.mockImplementation(
		() =>
			new Promise((resolve) => {
				answer = resolve;
			})
	);
	const { result, rerender } = renderDeletion(newClient());
	await settle();
	expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

	rerender({ isConfirmOpen: true });
	await settle();
	// Opened while the read is still on its way: the refetch joined it
	expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);

	await act(async () => answer(MENU));
	await waitFor(() => expect(result.current.status).toBe('ready'));
	expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
});

it('reads them afresh as it opens over what the team menu cached', async () => {
	mockGetTeamMenuOrganizations.mockResolvedValue(MENU);
	const client = newClient();
	client.setQueryData(queryKeys.organizationTeams.menuOrganizations('tenant-1', 'org-trial', 'user-1'), MENU);
	const { result, rerender } = renderDeletion(client);
	await settle();
	expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

	rerender({ isConfirmOpen: true });
	await waitFor(() => expect(result.current.status).toBe('ready'));
	expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
});

it('sends one request as it opens over a cached answer gone stale, which the opening reads again by itself', async () => {
	mockGetTeamMenuOrganizations.mockResolvedValue(MENU);
	const client = newClient();
	client.setQueryData(queryKeys.organizationTeams.menuOrganizations('tenant-1', 'org-trial', 'user-1'), MENU, {
		updatedAt: Date.now() - 11 * 60_000
	});
	const { result, rerender } = renderDeletion(client);
	await settle();
	expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

	rerender({ isConfirmOpen: true });
	await waitFor(() => expect(result.current.status).toBe('ready'));
	// The refetch joins that read rather than cancelling it for a second one
	expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
});
