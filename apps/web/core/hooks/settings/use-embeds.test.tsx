/** @jest-environment jsdom */

// cspell:ignore Fabrikam
/**
 * The client choice and the members option of a new credential: each offered only when the config, read once, says
 * the API can apply it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { userState } from '@/core/stores/user/user';

const mockReadConfig = jest.fn();
const mockCreateCredential = jest.fn();

jest.mock('@/core/services/client/api/embeds/embeds.service', () => ({
	EmbedClientNotLimitedError: class EmbedClientNotLimitedError extends Error {},
	EmbedMembersNotAddedError: class EmbedMembersNotAddedError extends Error {},
	embedsService: {
		readConfig: (...args: unknown[]) => mockReadConfig(...args),
		createCredential: (...args: unknown[]) => mockCreateCredential(...args)
	}
}));

import {
	EmbedClientNotLimitedError,
	EmbedMembersNotAddedError
} from '@/core/services/client/api/embeds/embeds.service';
import {
	canAllowAddMembersOf,
	canLimitToClientOf,
	useCreateEmbedCredential,
	useEmbedsAvailability
} from './use-embeds';

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
		expect(canLimitToClientOf('enabled', { enabled: true, clientLimits: true, addMembers: false })).toBe(true);
		expect(canLimitToClientOf('enabled', { enabled: true, clientLimits: false, addMembers: false })).toBe(false);
		expect(canLimitToClientOf('enabled', undefined)).toBe(false);
		for (const availability of ['loading', 'disabled', 'forbidden', 'error'] as const) {
			expect(canLimitToClientOf(availability, { enabled: true, clientLimits: true, addMembers: false })).toBe(
				false
			);
		}
	});
});

describe('canAllowAddMembersOf', () => {
	it('offers the members option only when embeds are on and the API says a credential can add members', () => {
		const addsMembers = { enabled: true, clientLimits: false, addMembers: true };
		expect(canAllowAddMembersOf('enabled', addsMembers)).toBe(true);
		expect(canAllowAddMembersOf('enabled', { ...addsMembers, addMembers: false })).toBe(false);
		expect(canAllowAddMembersOf('enabled', undefined)).toBe(false);
		for (const availability of ['loading', 'disabled', 'forbidden', 'error'] as const) {
			expect(canAllowAddMembersOf(availability, addsMembers)).toBe(false);
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

	it('reads the config again when the API made a credential without the client it was asked for', async () => {
		mockReadConfig.mockResolvedValueOnce({ enabled: true, clientLimits: true });
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: false });
		mockCreateCredential.mockRejectedValue(new EmbedClientNotLimitedError());

		const { result } = renderHook(
			() => ({ availability: useEmbedsAvailability(), create: useCreateEmbedCredential() }),
			{ wrapper: wrapperOf() }
		);
		await waitFor(() => expect(result.current.availability.canLimitToClient).toBe(true));

		result.current.create.mutate({ name: 'Fabrikam client portal', organizationContactId: 'contact-fabrikam' });

		await waitFor(() => expect(result.current.availability.canLimitToClient).toBe(false));
		expect(mockReadConfig).toHaveBeenCalledTimes(2);
		expect(result.current.create.isError).toBe(true);
	});

	it('says from the same config read whether a credential may add members', async () => {
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: false, addMembers: true });

		const { result } = renderHook(() => useEmbedsAvailability(), { wrapper: wrapperOf() });

		await waitFor(() => expect(result.current.availability).toBe('enabled'));
		expect(result.current.canAllowAddMembers).toBe(true);
		expect(result.current.canLimitToClient).toBe(false);
		expect(mockReadConfig).toHaveBeenCalledTimes(1);
	});

	it('offers no members option with an API that cannot let a credential add members', async () => {
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: true, addMembers: false });

		const { result } = renderHook(() => useEmbedsAvailability(), { wrapper: wrapperOf() });

		await waitFor(() => expect(result.current.availability).toBe('enabled'));
		expect(result.current.canAllowAddMembers).toBe(false);
	});

	it('reads the config again when the API made a credential without letting it add members', async () => {
		mockReadConfig.mockResolvedValueOnce({ enabled: true, clientLimits: true, addMembers: true });
		mockReadConfig.mockResolvedValue({ enabled: true, clientLimits: true, addMembers: false });
		mockCreateCredential.mockRejectedValue(new EmbedMembersNotAddedError());

		const { result } = renderHook(
			() => ({ availability: useEmbedsAvailability(), create: useCreateEmbedCredential() }),
			{ wrapper: wrapperOf() }
		);
		await waitFor(() => expect(result.current.availability.canAllowAddMembers).toBe(true));

		result.current.create.mutate({
			name: 'Fabrikam client portal',
			organizationContactId: null,
			canAddMembers: true
		});

		await waitFor(() => expect(result.current.availability.canAllowAddMembers).toBe(false));
		expect(mockReadConfig).toHaveBeenCalledTimes(2);
		expect(result.current.create.isError).toBe(true);
	});
});
