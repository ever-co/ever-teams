/**
 * @jest-environment jsdom
 */
/**
 * Switching organization from the team menu (ever-co/ever-teams#5204): Gauzy renews the session for the organization,
 * the cookies take it with the team to open, and the app starts again; a refused switch changes nothing.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockSwitchOrganizationRaw = jest.fn();
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { switchOrganizationRaw: (...args: unknown[]) => mockSwitchOrganizationRaw(...args) }
}));

const mockGetOrganizationTeams = jest.fn();
jest.mock('@/core/services/client/api/organizations/teams/team.service', () => ({
	organizationTeamService: { getOrganizationTeams: (...args: unknown[]) => mockGetOrganizationTeams(...args) }
}));

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', lastTeamId: 'labs-research' } })
}));

const mockCookies = {
	getTenantIdCookie: jest.fn(() => 'tenant-1'),
	setAccessTokenCookie: jest.fn(),
	setRefreshTokenCookie: jest.fn(),
	setOrganizationIdCookie: jest.fn(),
	setActiveTeamIdCookie: jest.fn()
};
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => mockCookies.getTenantIdCookie(),
	setAccessTokenCookie: (value: string) => mockCookies.setAccessTokenCookie(value),
	setRefreshTokenCookie: (value: string) => mockCookies.setRefreshTokenCookie(value),
	setOrganizationIdCookie: (value: string) => mockCookies.setOrganizationIdCookie(value),
	setActiveTeamIdCookie: (value: string) => mockCookies.setActiveTeamIdCookie(value)
}));

import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { useSwitchOrganization } from './use-switch-organization';

const assign = jest.fn();

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const labsTeam = (id: string) => ({ id, name: id, organizationId: 'labs' }) as unknown as TOrganizationTeam;

describe('useSwitchOrganization', () => {
	beforeAll(() => {
		Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
	});

	beforeEach(() => {
		jest.clearAllMocks();
		window.localStorage.clear();
		mockSwitchOrganizationRaw.mockResolvedValue({ data: { token: 'token-labs', refresh_token: 'refresh-labs' } });
	});

	it('takes the new session and the team picked, then starts the app again', async () => {
		const { result } = renderHook(() => useSwitchOrganization(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ organizationId: 'labs', team: labsTeam('labs-design') });
		});

		expect(mockSwitchOrganizationRaw).toHaveBeenCalledWith('labs');
		expect(mockCookies.setAccessTokenCookie).toHaveBeenCalledWith('token-labs');
		expect(mockCookies.setRefreshTokenCookie).toHaveBeenCalledWith('refresh-labs');
		expect(mockCookies.setOrganizationIdCookie).toHaveBeenCalledWith('labs');
		expect(mockCookies.setActiveTeamIdCookie).toHaveBeenCalledWith('labs-design');
		expect(window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM)).toBe('labs-design');
		expect(mockGetOrganizationTeams).not.toHaveBeenCalled();
		await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
	});

	it("opens the person's last team there when no team was picked, read with the new session", async () => {
		mockGetOrganizationTeams.mockResolvedValue({
			data: { items: [labsTeam('labs-design'), labsTeam('labs-research'), { id: 'studio-team', organizationId: 'studio' }] }
		});
		const { result } = renderHook(() => useSwitchOrganization(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ organizationId: 'labs' });
		});

		expect(mockGetOrganizationTeams).toHaveBeenCalledWith({
			scope: { tenantId: 'tenant-1', organizationId: 'labs', userId: 'user-1', accessToken: 'token-labs' }
		});
		expect(mockCookies.setActiveTeamIdCookie).toHaveBeenCalledWith('labs-research');
	});

	it('changes nothing when Gauzy refuses the switch', async () => {
		mockSwitchOrganizationRaw.mockRejectedValue(Object.assign(new Error('401'), { httpResponseStatus: 401 }));
		const { result } = renderHook(() => useSwitchOrganization(), { wrapper });

		await act(async () => {
			await expect(result.current.mutateAsync({ organizationId: 'labs' })).rejects.toThrow('401');
		});

		expect(mockCookies.setAccessTokenCookie).not.toHaveBeenCalled();
		expect(mockCookies.setOrganizationIdCookie).not.toHaveBeenCalled();
		expect(mockCookies.setActiveTeamIdCookie).not.toHaveBeenCalled();
		expect(assign).not.toHaveBeenCalled();
	});

	it('changes nothing when Gauzy answers without a session', async () => {
		mockSwitchOrganizationRaw.mockResolvedValue({ data: null });
		const { result } = renderHook(() => useSwitchOrganization(), { wrapper });

		await act(async () => {
			await expect(result.current.mutateAsync({ organizationId: 'labs' })).rejects.toThrow('refused');
		});

		expect(mockCookies.setAccessTokenCookie).not.toHaveBeenCalled();
		expect(assign).not.toHaveBeenCalled();
	});
});
