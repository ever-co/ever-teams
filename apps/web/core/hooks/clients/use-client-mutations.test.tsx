/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };
const mockCreateClient = jest.fn();
const mockUpdateClient = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => mockScope.organizationId,
	getTenantIdCookie: () => mockScope.tenantId
}));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationContactService: {
		createClient: (...args: unknown[]) => mockCreateClient(...args),
		updateClient: (...args: unknown[]) => mockUpdateClient(...args)
	}
}));

import { ClientWorkspaceChangedError, useClientMutations } from './use-client-mutations';

const draft = { name: 'Acme', primaryEmail: '', primaryPhone: '', notes: '' };

function renderMutations() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useClientMutations(), { wrapper });
}

describe('saving a client after another tab switched the workspace', () => {
	beforeEach(() => {
		mockScope.organizationId = 'organization-1';
		mockScope.tenantId = 'tenant-1';
		mockCreateClient.mockReset();
		mockCreateClient.mockResolvedValue({ id: 'client-1' });
		mockUpdateClient.mockReset();
	});

	it('saves the client in the workspace the form opened in', async () => {
		const { result } = renderMutations();

		await act(async () => {
			await result.current.createClient(draft as never);
		});

		expect(mockCreateClient).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'organization-1', tenantId: 'tenant-1' })
		);
	});

	it('sends nothing once the cookies name another workspace', async () => {
		const { result } = renderMutations();
		mockScope.organizationId = 'organization-2';

		await act(async () => {
			await expect(result.current.createClient(draft as never)).rejects.toBeInstanceOf(
				ClientWorkspaceChangedError
			);
		});

		expect(mockCreateClient).not.toHaveBeenCalled();
	});
});
