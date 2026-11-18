/** @jest-environment jsdom */

/**
 * The client choice of a new credential: offered only when the config, read once, says the API can limit a credential
 * to a client.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { userState } from '@/core/stores/user/user';

const mockReadConfig = jest.fn();

jest.mock('@/core/services/client/api/embeds/embeds.service', () => ({
	embedsService: {
		readConfig: (...args: unknown[]) => mockReadConfig(...args)
	}
}));

import { canLimitToClientOf, useEmbedsAvailability } from './use-embeds';

const TEAM = { id: 'team-1', name: 'Studio', organizationId: 'organization-1', tenantId: 'tenant-1', members: [] };

function wrapperOf() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(userState, { id: 'user-1', tenantId: 'tenant-1' } as never);
	store.set(organizationTeamsState, [TEAM] as never);
	store.set(activeTeamIdState, 'team-1');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return wrapper;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('canLimitToClientOf', () => {
	it('offers a client only when embeds are on and the API says it can limit a credential to one', () => {
		expect(canLimitToClientOf('enabled', { enabled: true, clientLimits: true })).toBe(true);
		expect(canLimitToClientOf('enabled', { enabled: true, clientLimits: false })).toBe(false);
		expect(canLimitToClientOf('enabled', undefined)).toBe(false);
		for (const availability of ['loading', 'disabled', 'forbidden', 'error'] as const) {
			expect(canLimitToClientOf(availability, { enabled: true, clientLimits: true })).toBe(false);
		}
	});
});

describe('useEmbedsAvailability', () => {
	it('says from the one config read whether a credential can be limited to a client', async () => {
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: true });

		const { result } = renderHook(() => useEmbedsAvailability(), { wrapper: wrapperOf() });

		await waitFor(() => expect(result.current.availability).toBe('enabled'));
		expect(result.current.canLimitToClient).toBe(true);
		expect(mockReadConfig).toHaveBeenCalledTimes(1);
	});

	it('offers no client with an API that cannot limit a credential to one', async () => {
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: false });

		const { result } = renderHook(() => useEmbedsAvailability(), { wrapper: wrapperOf() });

		await waitFor(() => expect(result.current.availability).toBe('enabled'));
		expect(result.current.canLimitToClient).toBe(false);
	});
});
