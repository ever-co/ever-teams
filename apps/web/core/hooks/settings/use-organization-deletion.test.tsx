/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { organizationService } from '@/core/services/client/api/organizations';
import { timerService } from '@/core/services/client/api/timers';
import { useOrganizationDeletion } from './use-organization-deletion';

let mockPermissions = ['ALL_ORG_EDIT'];
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ logOut: jest.fn() })
}));
const MENU = { current: { id: 'org-trial', name: 'Trial' }, others: [{ id: 'org-real', name: 'Ever Technologies' }] };
const mockRefetchMenuOrganizations = jest.fn();
/** The team menu's answer, already read; the request tests below run its real query instead. */
function fixedMenuOrganizations(options: { enabled?: boolean }) {
	void options;
	return { data: MENU, isFetching: false, isError: false, isSuccess: true, refetch: mockRefetchMenuOrganizations };
}
const mockUseTeamMenuOrganizations = jest.fn(fixedMenuOrganizations);
jest.mock('@/core/hooks/organizations/teams/use-team-menu-organizations', () => ({
	useTeamMenuOrganizations: (options: { enabled?: boolean }) => mockUseTeamMenuOrganizations(options)
}));
const mockGetTeamMenuOrganizations = jest.fn();
jest.mock('@/core/services/client/api/organizations/teams/team-menu-organizations.service', () => ({
	teamMenuOrganizationsService: {
		getTeamMenuOrganizations: (...args: unknown[]) => mockGetTeamMenuOrganizations(...args)
	}
}));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'access-token'
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'org-trial'
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

function newClient() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderDeletion(isConfirmOpen: boolean, client = newClient()) {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(
		(props: { isConfirmOpen: boolean }) => useOrganizationDeletion(ORGANIZATION, props.isConfirmOpen),
		{
			wrapper,
			initialProps: { isConfirmOpen }
		}
	);
}

function openConfirmation() {
	return renderDeletion(true);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockPermissions = ['ALL_ORG_EDIT'];
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

// The Workspace settings mount this hook with the confirmation closed: the organizations to land in are read once
// someone who may delete opens it, not before (ever-co/ever-teams#5309)
describe('the organizations to land in after the delete', () => {
	it('are not read while the confirmation is closed', () => {
		renderDeletion(false);

		expect(mockUseTeamMenuOrganizations).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockRefetchMenuOrganizations).not.toHaveBeenCalled();
	});

	it('are not read for someone who cannot delete the organization', () => {
		mockPermissions = [];

		renderDeletion(true);

		expect(mockUseTeamMenuOrganizations).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockRefetchMenuOrganizations).not.toHaveBeenCalled();
	});

	it('are read once the confirmation opens, joining a read already on its way', () => {
		renderDeletion(true);

		expect(mockUseTeamMenuOrganizations).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockRefetchMenuOrganizations).toHaveBeenCalledWith({ cancelRefetch: false });
	});
});

/**
 * The requests behind the organizations to land in, with the team menu's real query and a mocked service: one as the
 * confirmation opens while the read is on its way, a fresh one over a fresh cached answer, and one, not two, over an
 * answer gone stale, which the opening reads again by itself (the refetch joins that read: `cancelRefetch: false`).
 */
describe('the requests for the organizations to land in', () => {
	const menuKey = queryKeys.organizationTeams.menuOrganizations('tenant-1', 'org-trial', 'user-1');

	beforeEach(() => {
		const actual = jest.requireActual('@/core/hooks/organizations/teams/use-team-menu-organizations');
		mockUseTeamMenuOrganizations.mockImplementation(actual.useTeamMenuOrganizations);
		timer.getTimerStatus.mockResolvedValue(STOPPED as never);
	});

	afterEach(() => {
		mockUseTeamMenuOrganizations.mockImplementation(fixedMenuOrganizations);
	});

	/** Lets the effects and the query observers run, so a request that would start has started. */
	async function settle() {
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	}

	it('sends none while the confirmation is closed, and one as it opens while the read is on its way', async () => {
		let answer: (value: typeof MENU) => void = () => undefined;
		mockGetTeamMenuOrganizations.mockImplementation(
			() =>
				new Promise((resolve) => {
					answer = resolve;
				})
		);
		const { result, rerender } = renderDeletion(false);
		await settle();
		expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

		rerender({ isConfirmOpen: true });
		await settle();
		expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);

		await act(async () => answer(MENU));
		await waitFor(() => expect(result.current.status).toBe('ready'));
		expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
	});

	it('reads them afresh as it opens over what the team menu cached', async () => {
		mockGetTeamMenuOrganizations.mockResolvedValue(MENU);
		const client = newClient();
		client.setQueryData(menuKey, MENU);
		const { result, rerender } = renderDeletion(false, client);
		await settle();
		expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

		rerender({ isConfirmOpen: true });
		await waitFor(() => expect(result.current.status).toBe('ready'));
		expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
	});

	it('sends one request as it opens over a cached answer gone stale', async () => {
		mockGetTeamMenuOrganizations.mockResolvedValue(MENU);
		const client = newClient();
		client.setQueryData(menuKey, MENU, { updatedAt: Date.now() - 11 * 60_000 });
		const { result, rerender } = renderDeletion(false, client);
		await settle();
		expect(mockGetTeamMenuOrganizations).not.toHaveBeenCalled();

		rerender({ isConfirmOpen: true });
		await waitFor(() => expect(result.current.status).toBe('ready'));
		// The opening reads the stale answer again by itself: the refetch joins that read rather than sending a second
		expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1);
	});
});
