/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const mockUpdateOrganization = jest.fn();
const mockRenameTenant = jest.fn();
const mockOrganizationRead = { isError: false, refetch: jest.fn() };
const mockWorkspacesQuery = { isError: false, isSuccess: true, refetch: jest.fn() };
let mockWorkspaces: unknown[] = [];
let mockUser: { id: string; role: { name: string } } | undefined;
let mockPermissions: string[] = [];
let mockPermissionsLoading = false;
let mockSession = { tenantId: 'tenant-a', accessToken: 'token-a' };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: () => mockOrganizationRead
}));
jest.mock('@/core/hooks/auth/use-workspaces', () => ({
	useWorkspaces: () => ({ workspaces: mockWorkspaces, workspacesQuery: mockWorkspacesQuery })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions, isLoading: mockPermissionsLoading })
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => mockSession.tenantId,
	getAccessTokenCookie: () => mockSession.accessToken
}));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationService: { updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args) }
}));
jest.mock('@/core/services/client/api/tenants/tenant.service', () => ({
	tenantService: { renameTenant: (...args: unknown[]) => mockRenameTenant(...args) }
}));

import { useWorkspaceSettings } from './use-workspace-settings';

const mockToast = (jest.requireMock('sonner') as { toast: { error: jest.Mock; success: jest.Mock } }).toast;

const organization = { id: 'organization-a', name: 'Acme', currency: 'USD', dateFormat: null, numberFormat: null };

function workspaceOf(tenantId: string, name: string) {
	return {
		user: {
			id: `user-of-${tenantId}`,
			email: 'ada@ever.co',
			name: 'Ada',
			lastTeamId: null,
			tenant: { id: tenantId, name }
		},
		token: `token-of-${tenantId}`,
		current_teams: []
	};
}

const ORGANIZATION_KEY = queryKeys.workspaces.currentOrganizationByScope('tenant-a', 'organization-a');
const WORKSPACES_KEY = queryKeys.workspaces.byUser('user-a');
const WORKSPACE_A = expect.objectContaining({ tenantId: 'tenant-a', accessToken: 'token-a' });

function renderSettings(currentOrganization: object | null = organization) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.setQueryData(WORKSPACES_KEY, mockWorkspaces);
	const store = createStore();
	store.set(currentOrganizationState, currentOrganization as never);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(() => useWorkspaceSettings(), { wrapper });
	return { view, client };
}

function deferred() {
	let resolve: () => void = () => undefined;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

beforeEach(() => {
	jest.clearAllMocks();
	mockOrganizationRead.isError = false;
	mockWorkspacesQuery.isError = false;
	mockWorkspacesQuery.isSuccess = true;
	mockWorkspaces = [workspaceOf('tenant-a', 'Acme'), workspaceOf('tenant-b', 'Studio')];
	mockUser = { id: 'user-a', role: { name: 'SUPER_ADMIN' } };
	mockPermissions = ['ALL_ORG_EDIT'];
	mockPermissionsLoading = false;
	mockSession = { tenantId: 'tenant-a', accessToken: 'token-a' };
	mockUpdateOrganization.mockReset();
	mockUpdateOrganization.mockResolvedValue({});
	mockRenameTenant.mockReset();
	mockRenameTenant.mockResolvedValue(undefined);
});

describe('who may change the workspace settings', () => {
	it('lets a super admin change everything', () => {
		const { view } = renderSettings();

		expect(view.result.current.canEdit).toBe(true);
		expect(view.result.current.canRename).toBe(true);
	});

	it('lets an admin change the currency and the formats, and leaves the name to the super admin', () => {
		mockUser = { id: 'user-a', role: { name: 'ADMIN' } };
		const { view } = renderSettings();

		expect(view.result.current.canEdit).toBe(true);
		expect(view.result.current.canRename).toBe(false);
	});

	it('lets a member without the organization edit permission change nothing', () => {
		mockUser = { id: 'user-a', role: { name: 'EMPLOYEE' } };
		mockPermissions = ['ORG_TASK_SETTING'];
		const { view } = renderSettings();

		expect(view.result.current.canEdit).toBe(false);
		expect(view.result.current.canRename).toBe(false);
	});
});

describe('what the workspace page shows', () => {
	it("shows the name of the session's workspace as the switcher does", () => {
		const { view } = renderSettings();

		expect(view.result.current.name).toBe('Acme');
		expect(view.result.current.isLoading).toBe(false);
		expect(view.result.current.isLoadFailed).toBe(false);
	});

	it('waits for the organization, the workspace list and the permissions', () => {
		expect(renderSettings(null).view.result.current.isLoading).toBe(true);

		mockPermissionsLoading = true;
		expect(renderSettings().view.result.current.isLoading).toBe(true);

		mockPermissionsLoading = false;
		mockWorkspaces = [];
		mockWorkspacesQuery.isSuccess = false;
		expect(renderSettings().view.result.current.isLoading).toBe(true);
	});

	it('says when the organization could not be read, and reads both again on retry', () => {
		mockOrganizationRead.isError = true;
		const { view } = renderSettings(null);

		expect(view.result.current.isLoadFailed).toBe(true);
		expect(view.result.current.isLoading).toBe(false);
		view.result.current.retryLoad();
		expect(mockOrganizationRead.refetch).toHaveBeenCalled();
		expect(mockWorkspacesQuery.refetch).toHaveBeenCalled();
	});

	it('says when the workspace list could not be read', () => {
		mockWorkspaces = [];
		mockWorkspacesQuery.isSuccess = false;
		mockWorkspacesQuery.isError = true;
		const { view } = renderSettings();

		expect(view.result.current.isLoadFailed).toBe(true);
	});
});

describe('saving the currency and the formats', () => {
	it('saves the currency, keeps it for every reader of the organization and confirms it', async () => {
		const { view, client } = renderSettings();

		await act(async () => {
			await view.result.current.saveCurrency('EUR');
		});

		expect(mockUpdateOrganization).toHaveBeenCalledWith(organization, { currency: 'EUR' });
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual({ ...organization, currency: 'EUR' });
		expect(mockToast.success).toHaveBeenCalledWith('settings.workspace.CURRENCY_SAVED', {
			description: 'settings.workspace.CURRENCY_OUTCOME'
		});
	});

	it('saves a date and a number format, and Automatic as no format', async () => {
		const { view, client } = renderSettings();

		await act(async () => {
			await view.result.current.saveDateFormat('DD/MM/YYYY');
			await view.result.current.saveNumberFormat('1 234,56');
		});
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual({
			...organization,
			dateFormat: 'DD/MM/YYYY',
			numberFormat: '1 234,56'
		});

		await act(async () => {
			await view.result.current.saveDateFormat(null);
		});
		expect(mockUpdateOrganization).toHaveBeenLastCalledWith(expect.anything(), { dateFormat: null });
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual({
			...organization,
			dateFormat: null,
			numberFormat: '1 234,56'
		});
	});

	it('keeps the organization as the API stored it, with what another admin changed since the page read it', async () => {
		const pageCopy = {
			id: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
			name: 'Acme',
			isDefault: true,
			profile_link: 'acme',
			totalEmployees: 3,
			banner: null,
			currency: 'USD',
			dateFormat: null,
			numberFormat: null
		};
		const storedByApi = { ...pageCopy, currency: 'EUR', dateFormat: 'DD/MM/YYYY' };
		mockUpdateOrganization.mockResolvedValue(storedByApi);
		const { view, client } = renderSettings(pageCopy);

		await act(async () => {
			await view.result.current.saveDateFormat('DD/MM/YYYY');
		});

		const organizationKey = queryKeys.workspaces.currentOrganizationByScope('tenant-a', pageCopy.id);
		expect(client.getQueryData(organizationKey)).toEqual(storedByApi);
	});

	it('sends one save at a time, the second with what the first saved', async () => {
		const firstSave = deferred();
		mockUpdateOrganization.mockImplementationOnce(() => firstSave.promise);
		const { view } = renderSettings();

		let bothSaved: Promise<unknown> = Promise.resolve();
		act(() => {
			const { saveCurrency, saveDateFormat } = view.result.current;
			bothSaved = Promise.all([saveCurrency('EUR'), saveDateFormat('DD/MM/YYYY')]);
		});
		await act(async () => {
			await Promise.resolve();
		});
		expect(mockUpdateOrganization).toHaveBeenCalledTimes(1);

		await act(async () => {
			firstSave.resolve();
			await bothSaved;
		});

		expect(mockUpdateOrganization).toHaveBeenCalledTimes(2);
		expect(mockUpdateOrganization).toHaveBeenLastCalledWith(
			{ ...organization, currency: 'EUR' },
			{ dateFormat: 'DD/MM/YYYY' }
		);
	});

	it('tells why a refused save failed, keeps the stored value and throws so the control goes back', async () => {
		mockUpdateOrganization.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
		const { view, client } = renderSettings();

		let failure: unknown;
		await act(async () => {
			failure = await view.result.current.saveCurrency('EUR').catch((error) => error);
		});

		expect(failure).toBeInstanceOf(Error);
		expect(mockToast.error).toHaveBeenCalledWith('settings.workspace.CURRENCY_NOT_SAVED', {
			description: 'toasts.REASONS.PERMISSION'
		});
		expect(mockToast.success).not.toHaveBeenCalled();
		expect(client.getQueryData(ORGANIZATION_KEY)).toBeUndefined();
	});

	it('still saves after a save that failed', async () => {
		mockUpdateOrganization.mockRejectedValueOnce(new Error('offline'));
		const { view, client } = renderSettings();

		await act(async () => {
			await view.result.current.saveCurrency('EUR').catch(() => undefined);
			await view.result.current.saveCurrency('GBP');
		});

		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual({ ...organization, currency: 'GBP' });
	});
});

describe('renaming the workspace', () => {
	it('renames the organization, then the tenant, and shows the name in the workspace list at once', async () => {
		const calls: string[] = [];
		mockUpdateOrganization.mockImplementation(async () => {
			calls.push('organization');
			return {};
		});
		mockRenameTenant.mockImplementation(async () => {
			calls.push('tenant');
		});
		const { view, client } = renderSettings();
		const invalidate = jest.spyOn(client, 'invalidateQueries');

		await act(async () => {
			await view.result.current.saveName('Acme Labs');
		});

		expect(calls).toEqual(['organization', 'tenant']);
		expect(mockUpdateOrganization).toHaveBeenCalledWith(organization, { name: 'Acme Labs' });
		expect(mockRenameTenant).toHaveBeenCalledWith('Acme Labs', WORKSPACE_A);
		expect(client.getQueryData(WORKSPACES_KEY)).toEqual([
			workspaceOf('tenant-a', 'Acme Labs'),
			workspaceOf('tenant-b', 'Studio')
		]);
		expect(invalidate).toHaveBeenCalledWith({ queryKey: WORKSPACES_KEY });
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual({ ...organization, name: 'Acme Labs' });
		expect(mockToast.success).toHaveBeenCalledWith('settings.workspace.NAME_SAVED', { description: undefined });
	});

	it('renames the tenant alone when the organization already has that name', async () => {
		mockWorkspaces = [workspaceOf('tenant-a', 'ada@ever.co')];
		const { view } = renderSettings();

		await act(async () => {
			await view.result.current.saveName('Acme');
		});

		expect(mockUpdateOrganization).not.toHaveBeenCalled();
		expect(mockRenameTenant).toHaveBeenCalledWith('Acme', WORKSPACE_A);
	});

	it('renames the workspace the page was showing when another tab moves the session during the save', async () => {
		mockUpdateOrganization.mockImplementation(async () => {
			mockSession = { tenantId: 'tenant-b', accessToken: 'token-b' };
			return {};
		});
		const { view, client } = renderSettings();

		await act(async () => {
			await view.result.current.saveName('Acme Labs');
		});

		expect(mockRenameTenant).toHaveBeenCalledWith('Acme Labs', WORKSPACE_A);
		expect(client.getQueryData(WORKSPACES_KEY)).toEqual([
			workspaceOf('tenant-a', 'Acme Labs'),
			workspaceOf('tenant-b', 'Studio')
		]);
	});

	it('reads the signed-in user again, where the forms that create a project or a team take the name', async () => {
		const { view, client } = renderSettings();
		const invalidate = jest.spyOn(client, 'invalidateQueries');

		await act(async () => {
			await view.result.current.saveName('Acme Labs');
		});

		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.users.me });
	});

	it('keeps the name the switcher shows when the tenant rename is refused, says why and throws', async () => {
		mockRenameTenant.mockRejectedValue(Object.assign(new Error('Forbidden resource'), { statusCode: 403 }));
		const { view, client } = renderSettings();
		const invalidate = jest.spyOn(client, 'invalidateQueries');

		let failure: unknown;
		await act(async () => {
			failure = await view.result.current.saveName('Acme Labs').catch((error) => error);
		});

		expect(failure).toBeInstanceOf(Error);
		expect(client.getQueryData(WORKSPACES_KEY)).toEqual(mockWorkspaces);
		expect(invalidate).not.toHaveBeenCalled();
		expect(mockToast.error).toHaveBeenCalledWith('settings.workspace.NAME_NOT_SAVED', {
			description: 'toasts.REASONS.PERMISSION'
		});
		expect(mockToast.success).not.toHaveBeenCalled();
	});
});

describe('a rename the tenant does not take', () => {
	const refusal = Object.assign(new Error('Forbidden resource'), { statusCode: 403 });
	const renamedOrganization = { ...organization, name: 'Acme Labs' };

	async function failedRename(view: ReturnType<typeof renderSettings>['view'], name: string) {
		let failure: unknown;
		await act(async () => {
			failure = await view.result.current.saveName(name).catch((error) => error);
		});
		return failure;
	}

	it("gives the organization its name back when the tenant's is refused, so no half of the rename stays", async () => {
		mockRenameTenant.mockRejectedValue(refusal);
		const { view, client } = renderSettings();

		const failure = await failedRename(view, 'Acme Labs');

		expect(failure).toBe(refusal);
		expect(mockUpdateOrganization).toHaveBeenCalledTimes(2);
		expect(mockUpdateOrganization).toHaveBeenNthCalledWith(1, organization, { name: 'Acme Labs' });
		expect(mockUpdateOrganization).toHaveBeenNthCalledWith(2, renamedOrganization, { name: 'Acme' });
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual(organization);
		expect(mockToast.error).toHaveBeenCalledWith('settings.workspace.NAME_NOT_SAVED', {
			description: 'toasts.REASONS.PERMISSION'
		});
	});

	it('still says why the rename was refused when the name cannot be given back, and a new try finishes it', async () => {
		mockRenameTenant.mockRejectedValueOnce(refusal);
		mockUpdateOrganization.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Network Error'));
		const { view, client } = renderSettings();

		const failure = await failedRename(view, 'Acme Labs');

		expect(failure).toBe(refusal);
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual(renamedOrganization);

		await act(async () => {
			await view.result.current.saveName('Acme Labs');
		});

		expect(mockUpdateOrganization).toHaveBeenCalledTimes(2);
		expect(mockRenameTenant).toHaveBeenCalledTimes(2);
		expect(mockToast.success).toHaveBeenCalledWith('settings.workspace.NAME_SAVED', { description: undefined });
	});

	it('leaves the organization renamed when the tenant rename got no answer: trying again finishes it', async () => {
		mockRenameTenant.mockRejectedValueOnce(new Error('Network Error'));
		const { view, client } = renderSettings();

		await failedRename(view, 'Acme Labs');

		expect(mockUpdateOrganization).toHaveBeenCalledTimes(1);
		expect(client.getQueryData(ORGANIZATION_KEY)).toEqual(renamedOrganization);

		await act(async () => {
			await view.result.current.saveName('Acme Labs');
		});

		expect(mockUpdateOrganization).toHaveBeenCalledTimes(1);
		expect(mockRenameTenant).toHaveBeenCalledTimes(2);
	});

	it('writes nothing to an organization that already had the name', async () => {
		mockRenameTenant.mockRejectedValue(refusal);
		mockWorkspaces = [workspaceOf('tenant-a', 'ada@ever.co')];
		const { view } = renderSettings();

		await failedRename(view, 'Acme');

		expect(mockUpdateOrganization).not.toHaveBeenCalled();
	});
});
