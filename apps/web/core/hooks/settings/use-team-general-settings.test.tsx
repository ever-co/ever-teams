/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';

const mockEditOrganizationTeam = jest.fn();
const mockCreateImageAssets = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/core/lib/helpers/cookies', () => ({ setActiveProjectIdCookie: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-edit-organization-team', () => ({
	useEditOrganizationTeam: () => ({ editOrganizationTeam: mockEditOrganizationTeam })
}));
jest.mock('@/core/hooks/common/use-image-assets', () => ({
	useImageAssets: () => ({ createImageAssets: mockCreateImageAssets })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployee: jest.fn() })
}));
// The own tracking switch reads the permissions and saves the employee's switch through these (#5015); these tests
// save none
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployeeUpdate: () => ({ updateEmployeeAsync: jest.fn() })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: [], isSuccess: true, isLoaded: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: true, activeManager: null })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: { id: 'user-a' } }) }));

import { useTeamGeneralSettings } from './use-team-general-settings';

const mockToastError = jest.mocked((jest.requireMock('sonner') as { toast: { error: jest.Mock } }).toast.error);
const mockSetActiveProjectIdCookie = jest.mocked(
	(jest.requireMock('@/core/lib/helpers/cookies') as { setActiveProjectIdCookie: jest.Mock }).setActiveProjectIdCookie
);

const teamA = { id: 'team-a', name: 'Team A', organizationId: 'organization-a', tenantId: 'tenant-a', members: [] };
const teamB = { ...teamA, id: 'team-b', name: 'Team B' };

function renderSettings() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const invalidateQueries = jest.spyOn(client, 'invalidateQueries');
	const store = createStore();
	store.set(organizationTeamsState, [teamA, teamB] as never);
	store.set(activeTeamIdState, 'team-a');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const view = renderHook(() => useTeamGeneralSettings(), { wrapper });
	return { view, store, invalidateQueries };
}

describe('saving the team default project', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('moves new tasks to the saved default project', async () => {
		mockEditOrganizationTeam.mockResolvedValue({ data: { ...teamA, defaultProjectId: 'project-b' } });
		const { view } = renderSettings();

		await act(() => view.result.current.saveDefaultProject('project-b'));

		expect(mockSetActiveProjectIdCookie).toHaveBeenCalledWith('project-b');
	});

	it('reports a default project the server did not keep, so the selector goes back', async () => {
		mockEditOrganizationTeam.mockResolvedValue({ data: { ...teamA } });
		const { view } = renderSettings();

		await expect(view.result.current.saveDefaultProject('project-b')).rejects.toThrow();

		expect(mockToastError).toHaveBeenCalledWith('toasts.teams.DEFAULT_PROJECT_NOT_SAVED', {
			description: 'toasts.teams.DEFAULT_PROJECT_NOT_SUPPORTED'
		});
		expect(mockSetActiveProjectIdCookie).not.toHaveBeenCalled();
	});

	it('leaves the active project of a team the manager switched to while the save was on its way', async () => {
		let finishSave: (response: unknown) => void = () => undefined;
		mockEditOrganizationTeam.mockReturnValue(
			new Promise((resolve) => {
				finishSave = resolve;
			})
		);
		const { view, store } = renderSettings();

		await act(async () => {
			const saving = view.result.current.saveDefaultProject('project-b');
			store.set(activeTeamIdState, 'team-b');
			finishSave({ data: { ...teamA, defaultProjectId: 'project-b' } });
			await saving;
		});

		expect(mockSetActiveProjectIdCookie).not.toHaveBeenCalled();
	});

	it('reloads the teams when the save failed after the write may have landed', async () => {
		mockEditOrganizationTeam.mockRejectedValue(new Error('read after write failed'));
		const { view, invalidateQueries } = renderSettings();

		await expect(view.result.current.saveDefaultProject('project-b')).rejects.toThrow();

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.organizationTeams.all });
	});
});

describe('saving the team avatar', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEditOrganizationTeam.mockResolvedValue({ data: teamA });
	});

	it('sends only the avatar, never the team read before the upload', async () => {
		mockCreateImageAssets.mockResolvedValue({ id: 'image-1', url: 'https://example.test/a.png' });
		const { view } = renderSettings();

		await act(() => view.result.current.uploadAvatar(new File(['a'], 'a.png')));
		await act(() => view.result.current.removeAvatar());

		expect(mockEditOrganizationTeam).toHaveBeenNthCalledWith(1, {
			id: 'team-a',
			imageId: 'image-1',
			image: { id: 'image-1', url: 'https://example.test/a.png' }
		});
		expect(mockEditOrganizationTeam).toHaveBeenNthCalledWith(2, { id: 'team-a', imageId: null, image: null });
	});
});
