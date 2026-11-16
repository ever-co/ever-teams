/** @jest-environment jsdom */
/**
 * "Use … in every tab" moves the session back to this tab's organization (#5134). The tab stays on the team it shows:
 * its tasks, its active task and the project it chose stay as they are (CodeRabbit on #5321).
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSyncTokenOrganization = jest.fn();

jest.mock('@/core/lib/auth/token-organization', () => ({
	syncTokenOrganization: (...args: unknown[]) => mockSyncTokenOrganization(...args)
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { ACTIVE_PROJECT_COOKIE_NAME, ACTIVE_TEAM_COOKIE_NAME } from '@/core/constants/config/constants';
import {
	getSharedOrganizationIdCookie,
	setAccessTokenCookie,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setAuthCookies,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import { rememberTabTeam, resetTabOrganizationState } from '@/core/lib/auth/tab-organization';
import { activeTeamIdState, activeTeamTaskState, organizationTeamsState, teamTasksState } from '@/core/stores';
import { useTabOrganization } from './use-tab-organization';

/** An access token that decodes (only its payload is read). */
function token(organizationId: string) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const issuedAt = Math.floor(Date.now() / 1000);
	const payload = { id: 'user-1', tenantId: 'tenant-1', organizationId, iat: issuedAt, exp: issuedAt + 3600 };
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-${organizationId}`;
}

const TEAM_A = { id: 'team-a', name: 'Team A', organizationId: 'org-a', defaultProjectId: 'project-a' };
const TASKS = [{ id: 'task-1', title: 'One' }];

/** Tab A works on team A, on a project it chose; then tab B switches the shared cookies to organization B. */
function twoTabsInTwoOrganizations() {
	setAuthCookies({
		access_token: token('org-a'),
		refresh_token: { token: 'refresh-a' },
		tenantId: 'tenant-1',
		teamId: 'team-a',
		organizationId: 'org-a',
		languageId: 'en',
		noTeamPopup: true,
		userId: 'user-1'
	} as never);
	rememberTabTeam(TEAM_A);
	setActiveProjectIdCookie('project-a2');
	document.cookie = `${ACTIVE_PROJECT_COOKIE_NAME}=project-b; path=/`;
	setActiveTeamIdCookie('team-b');
	setOrganizationIdCookie('org-b');
	setAccessTokenCookie(token('org-b'));
}

function renderTab() {
	const store = createStore();
	store.set(organizationTeamsState, [TEAM_A] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(teamTasksState, TASKS as never);
	store.set(activeTeamTaskState, TASKS[0] as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return { store, ...renderHook(() => useTabOrganization(), { wrapper }) };
}

beforeEach(() => {
	resetTabOrganizationState();
	mockSyncTokenOrganization.mockReset();
	mockSyncTokenOrganization.mockResolvedValue(true);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('useTabOrganization, bringing this tab organization back to every tab', () => {
	it('moves the cookies and the session to its organization, team and chosen project', () => {
		twoTabsInTwoOrganizations();
		const { result } = renderTab();

		act(() => result.current.bringOwnOrganizationBack());

		expect(getSharedOrganizationIdCookie()).toBe('org-a');
		expect(document.cookie).toContain(`${ACTIVE_TEAM_COOKIE_NAME}=team-a`);
		expect(document.cookie).toContain(`${ACTIVE_PROJECT_COOKIE_NAME}=project-a2`);
		expect(mockSyncTokenOrganization).toHaveBeenCalledWith('org-a');
	});

	it("puts the other tab's cookies back when Gauzy refuses the switch, and the tab says again where it works", async () => {
		twoTabsInTwoOrganizations();
		mockSyncTokenOrganization.mockResolvedValue(false);
		const { result } = renderTab();

		await act(async () => {
			result.current.bringOwnOrganizationBack();
		});

		// The session stays in organization B, and so do the cookies: never organization A with organization B's token
		expect(getSharedOrganizationIdCookie()).toBe('org-b');
		expect(document.cookie).toContain(`${ACTIVE_TEAM_COOKIE_NAME}=team-b`);
		expect(document.cookie).toContain(`${ACTIVE_PROJECT_COOKIE_NAME}=project-b`);
		await waitFor(() => expect(result.current.state).toBe('own'));
	});

	it('does nothing while no other tab has another organization open', () => {
		setAuthCookies({
			access_token: token('org-a'),
			refresh_token: { token: 'refresh-a' },
			tenantId: 'tenant-1',
			teamId: 'team-a',
			organizationId: 'org-a',
			languageId: 'en',
			noTeamPopup: true,
			userId: 'user-1'
		} as never);
		rememberTabTeam(TEAM_A);
		const { result } = renderTab();

		act(() => result.current.bringOwnOrganizationBack());

		expect(mockSyncTokenOrganization).not.toHaveBeenCalled();
	});

	it('keeps its tasks and its active task', () => {
		twoTabsInTwoOrganizations();
		const { result, store } = renderTab();

		act(() => result.current.bringOwnOrganizationBack());

		expect(store.get(teamTasksState)).toBe(TASKS);
		expect(store.get(activeTeamTaskState)).toBe(TASKS[0]);
	});
});
