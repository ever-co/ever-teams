/** @jest-environment jsdom */
/**
 * The workspace import as a page runs it: files are read, then `confirm` creates what the plan holds. The lists of
 * the workspace are the hooks' own stand-ins here, and the API's creations are mocks.
 */
import { TextDecoder, TextEncoder } from 'node:util';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { TimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import type { WorkspacePickedFile } from '@/core/lib/utils/workspace-import-files';

// The import reads the files' bytes as UTF-8; jsdom has no TextDecoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockLists: { clients: Array<{ id: string; name: string }> } = { clients: [] };
const mockCreateClient = jest.fn();
const mockReadWorkspaceFiles = jest.fn();

jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useClientsQuery: () => ({
		activeClients: mockLists.clients,
		isLoaded: true,
		isError: false,
		refetch: async () => undefined
	})
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: [],
		isOrganizationProjectsLoaded: true,
		isOrganizationProjectsError: false
	})
}));
jest.mock('@/core/hooks/tasks/use-task-labels-query', () => ({
	useTaskLabelsQuery: () => ({ taskLabels: [], loading: false, isError: false, refetch: async () => undefined })
}));
jest.mock('@/core/hooks/tasks/use-invalidate-task-labels', () => ({
	useInvalidateTaskLabels: () => ({ invalidateTaskLabelsData: () => undefined })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['ALL_ORG_EDIT', 'ORG_CONTACT_VIEW', 'ORG_CONTACT_EDIT'] })
}));
const mockTimeImport = {
	reset: () => undefined,
	chooseFile: async () => undefined,
	confirm: async () => undefined,
	rows: [],
	stage: 'idle',
	summary: { readyCount: 0 }
};
jest.mock('@/core/hooks/timesheet/use-time-import', () => ({ useTimeImport: () => mockTimeImport }));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationContactService: { createClient: (...args: unknown[]) => mockCreateClient(...args) },
	organizationProjectService: {}
}));
jest.mock('@/core/services/client/api/tasks/task-label.service', () => ({ taskLabelService: {} }));
jest.mock('@/core/lib/utils/workspace-import-files', () => {
	const actual = jest.requireActual('@/core/lib/utils/workspace-import-files');
	return { ...actual, readWorkspaceFiles: (...args: unknown[]) => mockReadWorkspaceFiles(...args) };
});

import { useWorkspaceImport } from './use-workspace-import';

const ACCESS = {
	contextAt: () => ({ members: [], projects: [] }),
	saveScope: { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-a' }
} as unknown as TimeImportAccess;

function fileOf(name: string, text: string): WorkspacePickedFile {
	const bytes = new TextEncoder().encode(text);
	return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.slice().buffer };
}

function openImport() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const hook = renderHook(() => useWorkspaceImport(ACCESS), { wrapper });
	return { ...hook, queryClient };
}

beforeEach(() => {
	mockLists.clients = [];
	mockCreateClient.mockReset();
	const actual = jest.requireActual('@/core/lib/utils/workspace-import-files');
	mockReadWorkspaceFiles.mockReset();
	mockReadWorkspaceFiles.mockImplementation(actual.readWorkspaceFiles);
});

describe('reading the files', () => {
	it('leaves the reading screen when the reading fails, so the person can pick files again', async () => {
		const { result } = openImport();
		mockReadWorkspaceFiles.mockRejectedValueOnce(new Error('The browser could not read the file'));

		await act(async () => {
			await result.current.chooseFiles([fileOf('clients.csv', 'Name\nAcme\n')]).catch(() => undefined);
		});

		expect(result.current.isReading).toBe(false);
	});
});
