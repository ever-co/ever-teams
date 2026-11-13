/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';

const mockProjectService = {
	createOrganizationProject: jest.fn(),
	editOrganizationProject: jest.fn()
};

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/organizations', () => ({
	get organizationProjectService() {
		return mockProjectService;
	}
}));
jest.mock('@/core/lib/helpers/index', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));

import { useCreateOrganizationProject } from './use-create-organization-project';
import { useEditOrganizationProject } from './use-edit-organization-project';

interface ListedProject {
	id: string;
	billable: boolean;
}

interface ProjectsList {
	items: ListedProject[];
	total: number;
}

/** The projects list the timer and the Add time dialog take a project's billable setting from. */
const LIST_KEY = queryKeys.organizationProjects.byScope('tenant-a', 'organization-a');
const SLOW_READ_MS = 20;

function listOf(billable: boolean): ProjectsList {
	return { items: [{ id: 'project-1', billable }], total: 1 };
}

/** A read that answers after the save itself has, as a real one does. */
function slowListOf(billable: boolean): Promise<ProjectsList> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(listOf(billable)), SLOW_READ_MS);
	});
}

function billableInList(client: QueryClient) {
	const list = client.getQueryData<ProjectsList>(LIST_KEY);
	return list?.items[0]?.billable;
}

async function renderSaving() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const readList = jest.fn<Promise<ProjectsList>, []>();
	readList.mockResolvedValueOnce(listOf(false));
	readList.mockImplementationOnce(() => slowListOf(true));
	const view = renderHook(
		() => {
			useQuery({ queryKey: LIST_KEY, queryFn: readList });
			const { editOrganizationProject } = useEditOrganizationProject();
			const { createOrganizationProject } = useCreateOrganizationProject();
			return { createOrganizationProject, editOrganizationProject };
		},
		{ wrapper }
	);
	await waitFor(() => expect(billableInList(client)).toBe(false));
	return { client, view };
}

describe('the projects list once a project has been saved', () => {
	beforeEach(() => {
		mockProjectService.createOrganizationProject.mockResolvedValue({ id: 'project-1', billable: true });
		mockProjectService.editOrganizationProject.mockResolvedValue({ id: 'project-1', billable: true });
	});

	it('already holds the billable value of an edit when the edit is done', async () => {
		const { client, view } = await renderSaving();
		let billableWhenSaved: boolean | undefined;

		await act(async () => {
			await view.result.current.editOrganizationProject('project-1', { billable: true });
			billableWhenSaved = billableInList(client);
		});

		expect(billableWhenSaved).toBe(true);
	});

	it('already holds the billable value of a new project when the create is done', async () => {
		const { client, view } = await renderSaving();
		let billableWhenSaved: boolean | undefined;

		await act(async () => {
			await view.result.current.createOrganizationProject({ name: 'Website', billable: true });
			billableWhenSaved = billableInList(client);
		});

		expect(billableWhenSaved).toBe(true);
	});
});
