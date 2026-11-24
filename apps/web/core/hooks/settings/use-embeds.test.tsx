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
const mockSetPersonSignIn = jest.fn();

jest.mock('@/core/services/client/api/embeds/embeds.service', () => ({
	EmbedClientNotLimitedError: class EmbedClientNotLimitedError extends Error {},
	EmbedMembersNotAddedError: class EmbedMembersNotAddedError extends Error {},
	embedsService: {
		readConfig: (...args: unknown[]) => mockReadConfig(...args),
		createCredential: (...args: unknown[]) => mockCreateCredential(...args),
		setPersonSignIn: (...args: unknown[]) => mockSetPersonSignIn(...args)
	}
}));

import {
	EmbedClientNotLimitedError,
	EmbedMembersNotAddedError
} from '@/core/services/client/api/embeds/embeds.service';
import {
	canAllowAddMembersOf,
	canAllowPersonSignInOf,
	canLimitToClientOf,
	useCreateEmbedCredential,
	useEmbedsAvailability,
	useSetPersonSignIn
} from './use-embeds';
import { queryKeys } from '@/core/query/keys';

const TEAM = { id: 'team-1', name: 'Studio', organizationId: 'organization-1', tenantId: 'tenant-1', members: [] };

function wrapperOf(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
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

describe('canAllowPersonSignInOf', () => {
	it('offers the switch only when embeds are on and the API says people can sign in from a site', () => {
		const signsIn = { enabled: true, clientLimits: true, addMembers: true, personSignIn: true };
		expect(canAllowPersonSignInOf('enabled', signsIn)).toBe(true);
		expect(canAllowPersonSignInOf('enabled', { ...signsIn, personSignIn: undefined })).toBe(false);
		expect(canAllowPersonSignInOf('enabled', undefined)).toBe(false);
		for (const availability of ['loading', 'disabled', 'forbidden', 'error'] as const) {
			expect(canAllowPersonSignInOf(availability, signsIn)).toBe(false);
		}
	});
});

describe('useSetPersonSignIn', () => {
	const SITES_KEY = queryKeys.embeds.origins('tenant-1', 'organization-1');
	const SITE = { id: 'origin-1', origin: 'https://team.example.com', allowPersonSignIn: false };

	function siteListClient() {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		client.setQueryData(SITES_KEY, [SITE]);
		return client;
	}

	const switchOf = (client: QueryClient) => client.getQueryData<(typeof SITE)[]>(SITES_KEY)?.[0]?.allowPersonSignIn;

	it('moves the switch at once, and asks the API for that setting alone', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockSetPersonSignIn.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
		const client = siteListClient();
		const { result } = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });

		result.current.mutate({ id: 'origin-1', allowPersonSignIn: true });

		await waitFor(() => expect(switchOf(client)).toBe(true));
		expect(mockSetPersonSignIn).toHaveBeenCalledWith('origin-1', true);
		answer({ ...SITE, allowPersonSignIn: true });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('puts the switch back when the API refuses', async () => {
		mockSetPersonSignIn.mockRejectedValue({ statusCode: 403 });
		const client = siteListClient();
		const { result } = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });

		result.current.mutate({ id: 'origin-1', allowPersonSignIn: true });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(switchOf(client)).toBe(false);
	});

	it('puts back only the refused switch, and reads the list once the last change settles', async () => {
		const OTHER = { id: 'origin-2', origin: 'https://shop.example.com', allowPersonSignIn: false };
		const answers: Record<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }> = {};
		mockSetPersonSignIn.mockImplementation(
			(id: string) => new Promise((resolve, reject) => (answers[id] = { resolve, reject }))
		);
		const client = siteListClient();
		client.setQueryData(SITES_KEY, [SITE, OTHER]);
		const settingOf = (id: string) =>
			client.getQueryData<(typeof SITE)[]>(SITES_KEY)?.find((row) => row.id === id)?.allowPersonSignIn;
		const invalidate = jest.spyOn(client, 'invalidateQueries');
		const first = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });
		const second = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });

		first.result.current.mutate({ id: 'origin-1', allowPersonSignIn: true });
		await waitFor(() => expect(settingOf('origin-1')).toBe(true));
		second.result.current.mutate({ id: 'origin-2', allowPersonSignIn: true });
		await waitFor(() => expect(settingOf('origin-2')).toBe(true));

		answers['origin-2'].resolve({ ...OTHER, allowPersonSignIn: true });
		await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
		expect(invalidate).not.toHaveBeenCalled();
		expect(settingOf('origin-1')).toBe(true);
		answers['origin-1'].reject({ statusCode: 403 });
		await waitFor(() => expect(first.result.current.isError).toBe(true));

		expect(settingOf('origin-1')).toBe(false);
		expect(settingOf('origin-2')).toBe(true);
		await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
	});

	it('reads the list again when two changes settle in the same turn', async () => {
		const OTHER = { id: 'origin-2', origin: 'https://shop.example.com', allowPersonSignIn: false };
		const answers: Record<string, (value: unknown) => void> = {};
		mockSetPersonSignIn.mockImplementation((id: string) => new Promise((resolve) => (answers[id] = resolve)));
		const client = siteListClient();
		client.setQueryData(SITES_KEY, [SITE, OTHER]);
		const invalidate = jest.spyOn(client, 'invalidateQueries');
		const first = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });
		const second = renderHook(() => useSetPersonSignIn(), { wrapper: wrapperOf(client) });

		first.result.current.mutate({ id: 'origin-1', allowPersonSignIn: true });
		second.result.current.mutate({ id: 'origin-2', allowPersonSignIn: true });
		await waitFor(() => expect(Object.keys(answers)).toHaveLength(2));
		answers['origin-1']({ ...SITE, allowPersonSignIn: true });
		answers['origin-2']({ ...OTHER, allowPersonSignIn: true });

		await waitFor(() => expect(first.result.current.isSuccess && second.result.current.isSuccess).toBe(true));
		await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
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
