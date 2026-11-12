/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { TClient } from '@/core/types/schemas';

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
}

/** An answer of the API the test gives when it chooses to. */
function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => undefined;
	let reject: (error: Error) => void = () => undefined;
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

const acme: TClient = { id: 'client-acme', name: 'Acme' };
const zenith: TClient = { id: 'client-zenith', name: 'Zenith' };

const mockContactService = { getClients: jest.fn(), createClient: jest.fn() };
const mockCreateProject = jest.fn();

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/organizations', () => ({
	get organizationContactService() {
		return mockContactService;
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual('jotai') as typeof import('jotai');
	return {
		activeTeamState: atom({ id: 'team-1', name: 'Core', members: [] }),
		organizationTeamsState: atom([])
	};
});
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', role: { name: 'ADMIN' }, employee: { id: 'employee-1' } } })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ORG_CONTACT_EDIT'] })
}));
jest.mock('@/core/hooks/tags/use-tags-query', () => ({ useTagsQuery: () => ({ tags: [], loading: false }) }));
jest.mock('@/core/hooks/tags/use-create-tag', () => ({
	useCreateTag: () => ({ createTag: jest.fn(), createTagLoading: false })
}));
jest.mock('@/core/hooks/common/use-image-assets', () => ({
	useImageAssets: () => ({ createImageAssets: jest.fn(), loading: false })
}));
jest.mock('@/core/hooks/ai/use-dictation', () => ({
	appendDictatedText: (text: string, dictated: string) => `${text}${dictated}`
}));
jest.mock('@/core/hooks/organizations/projects/use-create-organization-project', () => ({
	useCreateOrganizationProject: () => ({
		createOrganizationProject: mockCreateProject,
		createOrganizationProjectLoading: false
	})
}));
jest.mock('@/core/hooks/organizations/projects/use-edit-organization-project', () => ({
	useEditOrganizationProject: () => ({ editOrganizationProject: jest.fn(), editOrganizationProjectLoading: false })
}));

import { useProjectComposer } from './use-project-composer';

function renderComposer() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useProjectComposer({ mode: 'create' }), { wrapper });
}

type Composer = ReturnType<typeof renderComposer>['result'];

/** The person types a project name, then picks "Create client" in the Client field: the API has not answered yet. */
async function startCreatingClient(result: Composer, name: string) {
	act(() => result.current.setName('Website'));
	act(() => {
		void result.current.addClient(name);
	});
	await waitFor(() => expect(result.current.isCreatingClient).toBe(true));
}

async function answerCreation(result: Composer, creation: Deferred<TClient>, client: TClient) {
	await act(async () => {
		creation.resolve(client);
		await creation.promise;
	});
	await waitFor(() => expect(result.current.isCreatingClient).toBe(false));
}

describe('the Client field of the project form while a client is being created', () => {
	beforeEach(() => {
		mockContactService.getClients.mockReset();
		mockContactService.createClient.mockReset();
		mockCreateProject.mockReset();
		mockContactService.getClients.mockResolvedValue([acme]);
		mockCreateProject.mockResolvedValue({ id: 'project-1', name: 'Website' });
	});

	it('does not save the project before the client exists, then saves it with that client', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		const { result } = renderComposer();
		await startCreatingClient(result, 'Zenith');

		await act(() => result.current.submit());

		expect(mockCreateProject).not.toHaveBeenCalled();

		await answerCreation(result, creation, zenith);
		expect(result.current.draft.clientId).toBe('client-zenith');

		await act(() => result.current.submit());

		expect(mockCreateProject).toHaveBeenCalledTimes(1);
		const [request] = mockCreateProject.mock.calls[0] as [Record<string, unknown>];
		expect(request).toMatchObject({ name: 'Website', organizationContactId: 'client-zenith' });
	});

	it('keeps the client picked while another one was being created, and still offers the created one', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		const { result } = renderComposer();
		await startCreatingClient(result, 'Zenith');

		act(() => result.current.setClientId('client-acme'));
		await answerCreation(result, creation, zenith);

		expect(result.current.draft.clientId).toBe('client-acme');
		const offeredIds = result.current.pickableClients.map((client) => client.id);
		expect(offeredIds).toContain('client-zenith');
	});

	it('saves the project with a client picked meanwhile, without waiting for the one being created', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		const { result } = renderComposer();
		await startCreatingClient(result, 'Zenith');
		expect(result.current.isAwaitingCreatedClient).toBe(true);

		act(() => result.current.setClientId('client-acme'));
		expect(result.current.isAwaitingCreatedClient).toBe(false);

		await act(() => result.current.submit());

		expect(mockCreateProject).toHaveBeenCalledTimes(1);
		const [request] = mockCreateProject.mock.calls[0] as [Record<string, unknown>];
		expect(request).toMatchObject({ name: 'Website', organizationContactId: 'client-acme' });

		await answerCreation(result, creation, zenith);
		expect(result.current.draft.clientId).toBe('client-acme');
	});

	it('keeps the field cleared while a client was being created', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		const { result } = renderComposer();
		await startCreatingClient(result, 'Zenith');

		act(() => result.current.setClientId(null));
		await answerCreation(result, creation, zenith);

		expect(result.current.draft.clientId).toBeNull();
	});
});

describe('creating a client from the project form before the client list is known', () => {
	beforeEach(() => {
		mockContactService.getClients.mockReset();
		mockContactService.createClient.mockReset();
	});

	it('waits for the list: until then a typed name cannot be told from an existing client', async () => {
		const listing = deferred<TClient[]>();
		mockContactService.getClients.mockReturnValue(listing.promise);
		const { result } = renderComposer();

		expect(result.current.clientListState).toBe('loading');
		expect(result.current.canCreateClient).toBe(false);

		await act(async () => {
			listing.resolve([acme]);
			await listing.promise;
		});

		await waitFor(() => expect(result.current.clientListState).toBe('ready'));
		expect(result.current.canCreateClient).toBe(true);
	});

	it('does not offer it when the list could not be read, and reads the list again on demand', async () => {
		mockContactService.getClients.mockRejectedValueOnce(new Error('Network Error'));
		const { result } = renderComposer();

		await waitFor(() => expect(result.current.clientListState).toBe('failed'));
		expect(result.current.canCreateClient).toBe(false);

		mockContactService.getClients.mockResolvedValue([acme]);
		act(() => result.current.retryClientList());

		await waitFor(() => expect(result.current.clientListState).toBe('ready'));
		expect(result.current.canCreateClient).toBe(true);
		const offeredIds = result.current.pickableClients.map((client) => client.id);
		expect(offeredIds).toEqual(['client-acme']);
	});
});
