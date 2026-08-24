/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import type { PropsWithChildren } from 'react';

let tenantId = 'tenant-a';
let organizationId = 'org-a';

const requests = new Map<
	string,
	{
		resolve: (value: unknown) => void;
		signal: AbortSignal;
		tenantId: string;
	}
>();
const getOrganizationById = jest.fn(
	(id: string, options: { scope: { tenantId: string }; signal: AbortSignal }) =>
		new Promise((resolve) => {
			requests.set(id, { resolve, signal: options.signal, tenantId: options.scope.tenantId });
		})
);

jest.mock('@/core/constants/config/constants', () => ({
	FAST_APP_BOOTSTRAP: { value: true }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => tenantId,
	getOrganizationIdCookie: () => organizationId,
	getAccessTokenCookie: () => `token-${tenantId}`
}));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationService: { getOrganizationById }
}));

// Load the schema barrel first to keep the repository's cyclic runtime schemas in their app order.
require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useGetCurrentOrganization } =
	require('../auth/use-current-organization') as typeof import('../auth/use-current-organization');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { currentOrganizationState } =
	require('@/core/stores/user/user-organizations') as typeof import('@/core/stores/user/user-organizations');

describe('fast scoped atom synchronization', () => {
	beforeEach(() => {
		tenantId = 'tenant-a';
		organizationId = 'org-a';
		requests.clear();
		getOrganizationById.mockClear();
	});

	it('pins HTTP scope, cancels A, and never lets A overwrite B when A resolves last', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<JotaiProvider store={store}>{children}</JotaiProvider>
			</QueryClientProvider>
		);

		const { rerender } = renderHook(
			({ generation }) => {
				void generation;
				return useGetCurrentOrganization();
			},
			{ wrapper, initialProps: { generation: 0 } }
		);

		await waitFor(() => expect(requests.has('org-a')).toBe(true));
		expect(requests.get('org-a')?.tenantId).toBe('tenant-a');

		tenantId = 'tenant-b';
		organizationId = 'org-b';
		rerender({ generation: 1 });

		await waitFor(() => expect(requests.has('org-b')).toBe(true));
		expect(requests.get('org-b')?.tenantId).toBe('tenant-b');
		await waitFor(() => expect(requests.get('org-a')?.signal.aborted).toBe(true));

		await act(async () => {
			requests.get('org-b')?.resolve({ id: 'org-b', name: 'B' });
		});
		await waitFor(() => expect(store.get(currentOrganizationState)?.id).toBe('org-b'));

		await act(async () => {
			requests.get('org-a')?.resolve({ id: 'org-a', name: 'A' });
		});
		expect(store.get(currentOrganizationState)?.id).toBe('org-b');
	});

	it('does not issue a fast organization request for an incomplete tenant scope', async () => {
		tenantId = '';
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<JotaiProvider store={store}>{children}</JotaiProvider>
			</QueryClientProvider>
		);

		renderHook(() => useGetCurrentOrganization(), { wrapper });
		await act(async () => undefined);

		expect(getOrganizationById).not.toHaveBeenCalled();
	});

	it('keeps a shared scoped request alive when one of multiple owners unmounts', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<JotaiProvider store={store}>{children}</JotaiProvider>
			</QueryClientProvider>
		);

		const firstOwner = renderHook(() => useGetCurrentOrganization(), { wrapper });
		renderHook(() => useGetCurrentOrganization(), { wrapper });
		await waitFor(() => expect(requests.has('org-a')).toBe(true));

		firstOwner.unmount();

		expect(requests.get('org-a')?.signal.aborted).toBe(false);
	});
});
