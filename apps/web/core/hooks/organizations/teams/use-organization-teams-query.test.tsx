/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import {
	activeTeamIdState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	organizationTeamsState
} from '@/core/stores';
import { queryKeys } from '@/core/query/keys';

jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	FAST_APP_BOOTSTRAP: { value: true },
	LAST_WORKSPACE_AND_TEAM: 'last-workspace-and-team'
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => 'token-a',
	getActiveTeamIdCookie: () => '',
	setActiveProjectIdCookie: jest.fn(),
	setActiveTeamIdCookie: jest.fn(),
	setOrganizationIdCookie: jest.fn()
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-a',
			tenantId: 'tenant-a',
			employee: { tenantId: 'tenant-a', organizationId: 'organization-a' }
		}
	})
}));
jest.mock('@/core/services/client/api/organizations/teams', () => ({
	organizationTeamService: {
		getOrganizationTeams: jest.fn(async () => ({ data: { items: [], total: 0 } })),
		getOrganizationTeam: jest.fn(async (id: string) => ({
			data: {
				id,
				name: 'Team A',
				organizationId: 'organization-a',
				tenantId: 'tenant-a',
				members: [],
				projects: []
			}
		}))
	}
}));
jest.mock('../../common', () => {
	const React = require('react') as typeof import('react');
	return {
		useFirstLoad: () => ({ firstLoadData: jest.fn() }),
		useSyncRef: <T,>(value: T) => {
			const ref = React.useRef(value);
			ref.current = value;
			return ref;
		}
	};
});
jest.mock('./use-teams-state', () => ({ useTeamsState: () => ({ setTeamsUpdate: jest.fn() }) }));
jest.mock('../../users', () => ({ useSettings: () => ({ updateAvatar: jest.fn() }) }));

import { useOrganizationTeamsQuery } from './use-organization-teams-query';
const mockGetOrganizationTeams = jest.mocked(
	(jest.requireMock('@/core/services/client/api/organizations/teams') as any).organizationTeamService
		.getOrganizationTeams
);

describe('fast organization-team ownership', () => {
	it('marks a cold empty response as no-team on its first hydration', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		store.set(organizationTeamsState, []);
		store.set(activeTeamIdState, '');
		store.set(isTeamMemberState, true);
		store.set(isTeamMemberJustDeletedState, false);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);

		const view = renderHook(
			() => {
				const owner = useOrganizationTeamsQuery({
					scope: {
						tenantId: 'tenant-a',
						organizationId: 'organization-a',
						userId: 'user-a',
						accessToken: 'token-a'
					}
				});
				useOrganizationTeamsQuery();
				return owner;
			},
			{ wrapper }
		);

		await waitFor(() => expect(mockGetOrganizationTeams).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(store.get(isTeamMemberState)).toBe(false));
		expect(store.get(isTeamMemberJustDeletedState)).toBe(true);

		await act(async () => {
			client.setQueryData(queryKeys.organizationTeams.listByScope('tenant-a', 'organization-a'), {
				data: {
					items: [
						{
							id: 'team-a',
							name: 'Team A',
							organizationId: 'organization-a',
							tenantId: 'tenant-a',
							members: [],
							projects: []
						}
					],
					total: 1
				}
			});
		});

		await waitFor(() => expect(view.result.current.teams).toHaveLength(1));
		await waitFor(() => expect(store.get(isTeamMemberState)).toBe(true));
		expect(store.get(isTeamMemberJustDeletedState)).toBe(false);
	});
});
