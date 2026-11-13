/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganizationProject } from '@/core/types/schemas';

const mockOrganizationRead = jest.fn();
const mockCreateProject = jest.fn();

jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: (options: unknown) => mockOrganizationRead(options)
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-a', role: { name: 'ADMIN' }, employee: { id: 'employee-a' } } })
}));
jest.mock('@/core/hooks/tags/use-tags-query', () => ({ useTagsQuery: () => ({ tags: [] }) }));
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
		createOrganizationProject: (...args: unknown[]) => mockCreateProject(...args),
		createOrganizationProjectLoading: false
	})
}));
jest.mock('@/core/hooks/organizations/projects/use-edit-organization-project', () => ({
	useEditOrganizationProject: () => ({ editOrganizationProject: jest.fn(), editOrganizationProjectLoading: false })
}));

// The form's Client field (#5082) reads and writes clients; these tests are about the budget's currency
jest.mock('@/core/hooks/clients/use-client-access', () => ({
	useClientAccess: () => ({ canCreate: false, canEdit: false, canArchive: false })
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useClientsQuery: () => ({
		clients: [],
		activeClients: [],
		archivedClients: [],
		isLoaded: true,
		isLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/hooks/clients/use-client-mutations', () => ({
	useClientMutations: () => ({ createClient: jest.fn(), isCreating: false })
}));

import { useProjectComposer, type ProjectComposerMode } from './use-project-composer';

const team = { id: 'team-a', name: 'Core', members: [] };
const organizationInEuros = { id: 'organization-a', name: 'Acme', currency: 'EUR' };

interface ComposerSetup {
	mode?: ProjectComposerMode;
	project?: TOrganizationProject;
	organization?: object | null;
}

function renderComposer({ mode = 'create', project, organization = null }: ComposerSetup = {}) {
	const store = createStore();
	store.set(organizationTeamsState, [team] as never);
	store.set(activeTeamIdState, team.id);
	store.set(currentOrganizationState, organization as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useProjectComposer({ mode, project }), { wrapper });
	const loadOrganization = (loaded: object) => {
		act(() => store.set(currentOrganizationState, loaded as never));
	};
	return { view, loadOrganization };
}

beforeEach(() => {
	jest.clearAllMocks();
	mockCreateProject.mockResolvedValue({ id: 'project-a' });
});

describe("the currency of a new project's budget", () => {
	it("starts in the workspace's currency when the organization is already read", () => {
		const { view } = renderComposer({ organization: organizationInEuros });

		expect(view.result.current.draft.currency).toBe('EUR');
	});

	it('reads the organization itself, so a form opened from any page gets its currency', () => {
		renderComposer();

		expect(mockOrganizationRead).toHaveBeenCalledWith({ enabled: true });
	});

	it("takes the workspace's currency when the organization arrives after the form opened", () => {
		const { view, loadOrganization } = renderComposer();
		expect(view.result.current.draft.currency).toBeNull();

		loadOrganization(organizationInEuros);

		expect(view.result.current.draft.currency).toBe('EUR');
	});

	it('keeps the currency the person picked when the organization arrives after it', () => {
		const { view, loadOrganization } = renderComposer();
		act(() => view.result.current.setCurrency('USD'));

		loadOrganization(organizationInEuros);

		expect(view.result.current.draft.currency).toBe('USD');
	});

	it("saves the project in the workspace's currency when none was picked", async () => {
		const { view, loadOrganization } = renderComposer();
		loadOrganization(organizationInEuros);
		act(() => view.result.current.setName('Website'));

		await act(async () => {
			await view.result.current.submit();
		});

		expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Website', currency: 'EUR' }));
	});
});

describe('the currency of a project being edited', () => {
	const projectWithoutCurrency = { id: 'project-a', name: 'Website', currency: null } as TOrganizationProject;

	it('stays unset, and the organization is not read for it', () => {
		const { view } = renderComposer({
			mode: 'edit',
			project: projectWithoutCurrency,
			organization: organizationInEuros
		});

		expect(view.result.current.draft.currency).toBeNull();
		expect(mockOrganizationRead).toHaveBeenCalledWith({ enabled: false });
	});
});
