/** @jest-environment jsdom */
/**
 * A new team is opened at once: the cookies, the session's token and the tab's active team move to it, and the team is
 * kept in local storage for this browser's next start. A browser that refuses its storage (full, blocked) made that
 * write throw after the cookies and the token had moved, and before the active team followed them, so the tab stayed
 * on the old team (Greptile on #5345).
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSyncTokenOrganization = jest.fn<Promise<boolean>, [string | null | undefined]>(async () => true);
const mockSetActiveTeamIdCookie = jest.fn();
const mockSetOrganizationIdCookie = jest.fn();
const mockRefreshToken = jest.fn(async () => undefined);
const mockUpdateLastTeam = jest.fn();
const mockCreateOrganizationTeam = jest.fn();
const mockToastMoment = jest.fn();

jest.mock('@/core/lib/auth/token-organization', () => ({
	syncTokenOrganization: (organizationId?: string | null) => mockSyncTokenOrganization(organizationId)
}));
jest.mock('@/core/lib/auth/tab-organization', () => ({ rememberTabTeam: jest.fn() }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setActiveProjectIdCookie: jest.fn(),
	setActiveTeamIdCookie: (teamId: string) => mockSetActiveTeamIdCookie(teamId),
	setOrganizationIdCookie: (organizationId: string) => mockSetOrganizationIdCookie(organizationId)
}));
jest.mock('@/core/services/client/api/organizations/teams', () => ({
	organizationTeamService: { createOrganizationTeam: (...args: unknown[]) => mockCreateOrganizationTeam(...args) }
}));
jest.mock('../../common', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		useSyncRef: <T,>(value: T) => {
			const ref = React.useRef(value);
			ref.current = value;
			return ref;
		}
	};
});
jest.mock('../../common/use-cache-invalidation', () => ({
	useCacheInvalidation: () => ({ smartInvalidate: jest.fn(async () => undefined) })
}));
jest.mock('../../auth', () => ({
	useAuthenticateUser: () => ({ refreshToken: mockRefreshToken, user: { id: 'user-1', lastTeamId: 'team-a' } })
}));
jest.mock('../../users', () => ({ useSettings: () => ({ updateAvatar: mockUpdateLastTeam }) }));
jest.mock('@/core/components/common/toast-moment', () => ({
	toastMoment: (...args: unknown[]) => mockToastMoment(...args)
}));
jest.mock('@/core/components/icons', () => ({ UsersGroup: () => null }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { useCreateOrganizationTeam } from './use-create-organization-team';

const TEAM_A = { id: 'team-a', name: 'Team A', organizationId: 'org-a' };
const TEAM_B = { id: 'team-b', name: 'Team B', organizationId: 'org-b' };

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

function renderCreateTeam() {
	const store = createStore();
	store.set(organizationTeamsState, [TEAM_A] as never);
	store.set(activeTeamIdState, 'team-a');
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return { store, ...renderHook(() => useCreateOrganizationTeam(), { wrapper }) };
}

/** The cookies, the session and the tab's active team are all on team B: none is left on team A. */
function expectSwitchedToTeamB(store: ReturnType<typeof createStore>) {
	expect(mockSetActiveTeamIdCookie).toHaveBeenCalledWith('team-b');
	expect(mockSetOrganizationIdCookie).toHaveBeenCalledWith('org-b');
	expect(mockSyncTokenOrganization).toHaveBeenCalledWith('org-b');
	expect(mockUpdateLastTeam).toHaveBeenCalledWith({ id: 'user-1', lastTeamId: 'team-b' });
	expect(store.get(activeTeamIdState)).toBe('team-b');
}

beforeEach(() => {
	jest.clearAllMocks();
	window.localStorage.clear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('useCreateOrganizationTeam, opening a team', () => {
	it('moves the cookies, the session and the active team to it, and keeps it for the next start', () => {
		const { result, store } = renderCreateTeam();

		act(() => result.current.setActiveTeam(TEAM_B as never));

		expectSwitchedToTeamB(store);
		expect(window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM)).toBe('team-b');
	});

	it.each(['full', 'blocked'] as const)('still finishes the switch when the storage is %s', (refusal) => {
		const { result, store } = renderCreateTeam();
		refuseStorage[refusal]();

		act(() => result.current.setActiveTeam(TEAM_B as never));

		expectSwitchedToTeamB(store);
	});

	it.each(['full', 'blocked'] as const)(
		'opens a team just created and lists it when the storage is %s',
		async (refusal) => {
			mockCreateOrganizationTeam.mockResolvedValue({ data: { items: [TEAM_A, TEAM_B] } });
			const { result, store } = renderCreateTeam();
			refuseStorage[refusal]();

			await act(async () => {
				await result.current.createOrganizationTeam('Team B');
			});

			expectSwitchedToTeamB(store);
			// The steps after the switch ran too: the session renewed, the list holds the team, the plain toast
			expect(mockRefreshToken).toHaveBeenCalled();
			expect(store.get(organizationTeamsState)).toEqual([TEAM_A, TEAM_B]);
			expect(mockToastMoment).toHaveBeenCalledTimes(1);
			expect(mockToastMoment.mock.calls[0]).toHaveLength(2);
		}
	);
});
