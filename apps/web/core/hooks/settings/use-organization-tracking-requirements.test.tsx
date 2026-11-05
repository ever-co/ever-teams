/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const mockUpdateOrganization = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
const mockOrganizationRead = { isError: false, refetch: jest.fn() };

jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: () => mockOrganizationRead
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getTenantIdCookie: () => 'tenant-a' }));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationService: { updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args) }
}));

import { useOrganizationTrackingRequirements } from './use-organization-tracking-requirements';

const mockToastError = jest.mocked((jest.requireMock('sonner') as { toast: { error: jest.Mock } }).toast.error);

const organization = { id: 'organization-a', name: 'Acme', currency: 'USD', requireTeam: false, requireProject: false };

function renderRequirements() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, organization as never);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(() => useOrganizationTrackingRequirements(), { wrapper });
	return { view, client };
}

const cachedOrganization = (client: QueryClient) =>
	client.getQueryData(queryKeys.workspaces.currentOrganizationByScope('tenant-a', 'organization-a'));

describe('saving an organization tracking requirement', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('saves the one switch and keeps the saved organization for every reader', async () => {
		mockUpdateOrganization.mockResolvedValue({});
		const { view, client } = renderRequirements();

		await act(async () => {
			await view.result.current.saveRequirement('requireTeam', true);
		});

		expect(mockUpdateOrganization).toHaveBeenCalledWith(organization, { requireTeam: true });
		expect(cachedOrganization(client)).toEqual({ ...organization, requireTeam: true });
	});

	it('keeps both switches when two saves run at the same time', async () => {
		mockUpdateOrganization.mockResolvedValue({});
		const { view, client } = renderRequirements();

		await act(async () => {
			const { saveRequirement } = view.result.current;
			await Promise.all([saveRequirement('requireTeam', true), saveRequirement('requireProject', true)]);
		});

		expect(cachedOrganization(client)).toEqual({ ...organization, requireTeam: true, requireProject: true });
	});

	it('says when the organization could not be read and reads it again on retry', () => {
		mockOrganizationRead.isError = true;
		const { view } = renderRequirements();

		expect(view.result.current.isLoadFailed).toBe(true);
		view.result.current.retryLoad();
		expect(mockOrganizationRead.refetch).toHaveBeenCalled();
		mockOrganizationRead.isError = false;
	});

	it('tells why a refused save failed, keeps the stored value and throws so the switch goes back', async () => {
		mockUpdateOrganization.mockRejectedValue(new Error('Forbidden'));
		const { view, client } = renderRequirements();

		let failure: unknown;
		await act(async () => {
			failure = await view.result.current.saveRequirement('requireProject', true).catch((error) => error);
		});

		expect(failure).toBeInstanceOf(Error);
		expect(mockToastError).toHaveBeenCalledWith('settings.teamGeneral.REQUIREMENT_NOT_SAVED', expect.anything());
		expect(cachedOrganization(client)).toBeUndefined();
	});
});
