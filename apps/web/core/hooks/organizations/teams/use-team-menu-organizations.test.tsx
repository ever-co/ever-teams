/** @jest-environment jsdom */
/**
 * The team menu's organizations are read for the organization the app acts in: the one the cookie names, which a
 * switch moved, not the one of the person's employee record.
 */
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetTeamMenuOrganizations = jest.fn();
let mockOrganizationCookie: string | undefined;

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-1',
			tenantId: 'tenant-1',
			role: { name: 'EMPLOYEE' },
			employee: { tenantId: 'tenant-1', organizationId: 'studio' }
		}
	})
}));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'access-token'
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getOrganizationIdCookie: () => mockOrganizationCookie }));
jest.mock('@/core/services/client/api/organizations/teams/team-menu-organizations.service', () => ({
	teamMenuOrganizationsService: {
		getTeamMenuOrganizations: (...args: unknown[]) => mockGetTeamMenuOrganizations(...args)
	}
}));

import { useTeamMenuOrganizations } from './use-team-menu-organizations';

function readMenuOrganizations() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useTeamMenuOrganizations(), { wrapper });
}

beforeEach(() => {
	mockGetTeamMenuOrganizations.mockReset();
	mockGetTeamMenuOrganizations.mockResolvedValue({ current: null, others: [] });
});

it('reads them for the organization the cookie names after a switch, not the employee record', async () => {
	mockOrganizationCookie = 'labs';

	readMenuOrganizations();

	await waitFor(() => expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1));
	expect(mockGetTeamMenuOrganizations.mock.calls[0][0].scope.organizationId).toBe('labs');
});

it('falls back on the employee record when no cookie names one', async () => {
	mockOrganizationCookie = undefined;

	readMenuOrganizations();

	await waitFor(() => expect(mockGetTeamMenuOrganizations).toHaveBeenCalledTimes(1));
	expect(mockGetTeamMenuOrganizations.mock.calls[0][0].scope.organizationId).toBe('studio');
});
