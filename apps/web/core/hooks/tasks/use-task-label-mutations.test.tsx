/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const mockCreate = jest.fn();
const mockEdit = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('@/core/services/client/api/tasks/task-label.service', () => ({
	taskLabelService: {
		createTaskLabels: (...args: unknown[]) => mockCreate(...args),
		editTaskLabels: (...args: unknown[]) => mockEdit(...args)
	}
}));
jest.mock('./use-invalidate-task-labels', () => ({
	useInvalidateTaskLabels: () => ({
		invalidateTaskLabelsData: mockInvalidate,
		teamId: 'team-1',
		organizationId: 'org-1',
		tenantId: 'tenant-1'
	})
}));
jest.mock('@/core/lib/helpers/task', () => ({ mergeTaskLabelData: (data: unknown) => data }));

import { useCreateTaskLabel } from './use-create-task-label';
import { useEditTaskLabel } from './use-edit-task-label';

const nameTaken = () =>
	new ApiErrorService('A tag named "Bug" already exists here.', 409, 'UNIQUE_CONSTRAINT_VIOLATION', { field: 'name' });

function renderWithClient<T>(useHook: () => T) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { client, ...renderHook(useHook, { wrapper }) };
}

/** Run a mutation that is expected to fail, and hand back what it failed with. */
async function failureOf(run: () => Promise<unknown>) {
	let failure: unknown;
	await act(async () => {
		failure = await run().then(
			() => null,
			(error: unknown) => error
		);
	});
	return failure;
}

describe('task label mutations, on a name Gauzy finds taken', () => {
	beforeEach(() => {
		mockCreate.mockReset();
		mockEdit.mockReset();
		mockInvalidate.mockReset();
	});

	it('reads the team labels again after a create refused for its name, and still fails the create', async () => {
		mockCreate.mockRejectedValue(nameTaken());
		const { result } = renderWithClient(() => useCreateTaskLabel());

		const failure = await failureOf(() => result.current.createTaskLabels({ name: 'bug', color: '#D73A4A' }));

		expect(isNameTaken(failure)).toBe(true);
		expect(mockInvalidate).toHaveBeenCalledTimes(1);
	});

	it('reads them again after a rename refused for its name', async () => {
		mockEdit.mockRejectedValue(nameTaken());
		const { result } = renderWithClient(() => useEditTaskLabel());

		await failureOf(() => result.current.editTaskLabels({ id: 'label-1', data: { name: 'Bug' } }));

		expect(mockInvalidate).toHaveBeenCalledTimes(1);
	});

	it('leaves the list alone on any other failure', async () => {
		mockCreate.mockRejectedValue(new ApiErrorService('Internal error', 500));
		const { result } = renderWithClient(() => useCreateTaskLabel());

		await failureOf(() => result.current.createTaskLabels({ name: 'Bug', color: '#D73A4A' }));

		expect(mockInvalidate).not.toHaveBeenCalled();
	});

	it('keeps the failure for the global toast: neither mutation handles its own error', async () => {
		mockCreate.mockRejectedValue(nameTaken());
		mockEdit.mockRejectedValue(nameTaken());
		const { client, result } = renderWithClient(() => ({ create: useCreateTaskLabel(), edit: useEditTaskLabel() }));

		await failureOf(() => result.current.create.createTaskLabels({ name: 'Bug', color: '#D73A4A' }));
		await failureOf(() => result.current.edit.editTaskLabels({ id: 'label-1', data: { name: 'Bug' } }));

		const mutations = client.getMutationCache().getAll();
		expect(mutations).toHaveLength(2);
		for (const mutation of mutations) {
			expect(mutation.options.onError).toBeUndefined();
			expect(mutation.meta?.handlesOwnError).toBeUndefined();
		}
	});
});

function isNameTaken(error: unknown) {
	return ApiErrorService.isApiError(error) && error.statusCode === 409 && error.errorCode === 'UNIQUE_CONSTRAINT_VIOLATION';
}
