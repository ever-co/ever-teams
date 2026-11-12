/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TEditProjectRequest } from '@/core/types/schemas';
import { useEditOrganizationProject } from './use-edit-organization-project';

const mockEditOrganizationProject = jest.fn();

jest.mock('@/core/services/client/api/organizations', () => ({
	organizationProjectService: {
		editOrganizationProject: (...args: unknown[]) => mockEditOrganizationProject(...args)
	}
}));
jest.mock('@/core/lib/helpers/index', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

async function invalidatedKeysAfter(edit: TEditProjectRequest) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useEditOrganizationProject(), { wrapper });

	await act(async () => {
		await result.current.editOrganizationProject('project-1', edit);
	});

	return invalidated.mock.calls.map(([filters]) => filters?.queryKey);
}

beforeEach(() => {
	mockEditOrganizationProject.mockResolvedValue({ id: 'project-1', name: 'Website' });
});

describe('useEditOrganizationProject', () => {
	it('reads the budget report again when the edit sends the budget, its type or its currency', async () => {
		const afterBudget = await invalidatedKeysAfter({ budget: 120 });
		const afterType = await invalidatedKeysAfter({ budgetType: EProjectBudgetType.COST });
		const afterCurrency = await invalidatedKeysAfter({ currency: 'EUR' });

		for (const keys of [afterBudget, afterType, afterCurrency]) {
			expect(keys).toContainEqual(queryKeys.timesheet.reports.all);
			expect(keys).toContainEqual(queryKeys.organizationProjects.all);
		}
	});

	it('leaves the budget report alone for an edit of anything else, an archive included', async () => {
		const afterDescription = await invalidatedKeysAfter({ description: 'New scope' });
		const afterArchive = await invalidatedKeysAfter({ isArchived: true });

		for (const keys of [afterDescription, afterArchive]) {
			expect(keys).toContainEqual(queryKeys.organizationProjects.all);
			expect(keys).not.toContainEqual(queryKeys.timesheet.reports.all);
		}
	});

	it('reads the projects again when the edit failed, as a timeout may hide a saved edit', async () => {
		mockEditOrganizationProject.mockRejectedValue(new Error('timeout'));
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		const keys = await invalidatedKeysAfter({ budget: 120 });

		expect(keys).toContainEqual(queryKeys.organizationProjects.all);
		expect(keys).toContainEqual(queryKeys.timesheet.reports.all);
		consoleError.mockRestore();
	});
});
