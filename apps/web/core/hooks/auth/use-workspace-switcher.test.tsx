/** @jest-environment jsdom */
/**
 * Switching workspace: Gauzy opens a session in the other workspace, the cookies take it with its team, and the page
 * starts again on it. The team is kept in local storage for this browser's next start, which is a convenience: a
 * browser that refuses its storage (full, blocked) refused the whole switch before it was asked (Greptile on #5345).
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSwitchWorkspace = jest.fn();
const mockSetAuthCookies = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/core/services/client/api/auth', () => ({
	workspaceService: { switchWorkspace: (tenantId: string) => mockSwitchWorkspace(tenantId) }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setAuthCookies: (cookies: unknown) => mockSetAuthCookies(cookies),
	getOrganizationIdCookie: () => 'org-a',
	getActiveLanguageIdCookie: () => 'en'
}));
jest.mock('../queries/user-user.query', () => ({ useUserQuery: () => ({ data: { email: 'person@example.com' } }) }));
jest.mock('./use-workspaces', () => ({ useWorkspaces: () => ({ workspaces: [mockWorkspaceA, mockWorkspaceB] }) }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import type { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { useWorkspaceSwitcher } from './use-workspace-switcher';

const mockWorkspaceA = {
	user: { tenant: { id: 'tenant-a' }, lastTeamId: 'team-a', lastLoginAt: '2026-11-15T10:00:00.000Z' },
	current_teams: [{ team_id: 'team-a' }]
};
const mockWorkspaceB = {
	user: { tenant: { id: 'tenant-b' }, lastTeamId: null, lastLoginAt: '2026-11-01T10:00:00.000Z' },
	current_teams: [{ team_id: 'team-b1' }, { team_id: 'team-b2' }]
};

/** The browser refuses its storage: full (the write throws) or blocked (even reaching it throws). */
const refuseStorage = {
	full: () =>
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
		}),
	blocked: () =>
		jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('Access is denied for this document.', 'SecurityError');
		})
};

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const location = { href: '' };

beforeAll(() => {
	Object.defineProperty(window, 'location', { configurable: true, value: location });
});

beforeEach(() => {
	jest.clearAllMocks();
	location.href = '';
	window.localStorage.clear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	mockSwitchWorkspace.mockResolvedValue({
		user: { tenantId: 'tenant-b', id: 'user-1', employee: { organizationId: 'org-b' } },
		token: 'token-b',
		refresh_token: 'refresh-b'
	});
});

afterEach(() => jest.restoreAllMocks());

describe('useWorkspaceSwitcher', () => {
	it('opens the other workspace on its team, and keeps the team for the next start', async () => {
		window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, 'team-b2');
		window.localStorage.setItem(USER_SAW_OUTSTANDING_NOTIFICATION, 'true');
		const { result } = renderHook(() => useWorkspaceSwitcher(), { wrapper });

		act(() => result.current.switchToWorkspace(mockWorkspaceB as unknown as TWorkspace));

		await waitFor(() => expect(location.href).toBe('/'));
		expect(mockSwitchWorkspace).toHaveBeenCalledWith('tenant-b');
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({ access_token: 'token-b', teamId: 'team-b2', tenantId: 'tenant-b', organizationId: 'org-b' })
		);
		expect(window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM)).toBe('team-b2');
		expect(window.localStorage.getItem(USER_SAW_OUTSTANDING_NOTIFICATION)).toBeNull();
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it.each(['full', 'blocked'] as const)('still switches when the storage is %s', async (refusal) => {
		const { result } = renderHook(() => useWorkspaceSwitcher(), { wrapper });
		refuseStorage[refusal]();

		act(() => result.current.switchToWorkspace(mockWorkspaceB as unknown as TWorkspace));

		await waitFor(() => expect(location.href).toBe('/'));
		expect(mockSwitchWorkspace).toHaveBeenCalledWith('tenant-b');
		// The cookies carry the new session and its team: the first one, as no last team could be read
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({ access_token: 'token-b', teamId: 'team-b1', tenantId: 'tenant-b' })
		);
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it("keeps this browser's last team when Gauzy refuses the switch", async () => {
		window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, 'team-a');
		mockSwitchWorkspace.mockRejectedValue(Object.assign(new Error('401'), { httpResponseStatus: 401 }));
		const { result } = renderHook(() => useWorkspaceSwitcher(), { wrapper });

		act(() => result.current.switchToWorkspace(mockWorkspaceB as unknown as TWorkspace));

		await waitFor(() => expect(mockToastError).toHaveBeenCalled());
		expect(mockSetAuthCookies).not.toHaveBeenCalled();
		expect(location.href).toBe('');
		expect(window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM)).toBe('team-a');
	});
});
