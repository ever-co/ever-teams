/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const mockCreateTask = jest.fn();

jest.mock('@/core/services/client/api', () => ({
	taskService: { createTask: (...args: unknown[]) => mockCreateTask(...args) }
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('./use-invalidate-team-tasks', () => ({
	useInvalidateTeamTasks: () => ({ invalidateTeamTasksData: jest.fn() })
}));
jest.mock('../../tasks/use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: [
			{ id: 'status-backlog', name: 'backlog' },
			{ id: 'status-open', name: 'open' }
		]
	})
}));

import { useCreateTask } from './use-create-task';

function renderCreateTask() {
	const queryClient = new QueryClient();
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useCreateTask(), { wrapper });
}

/**
 * The create form's rich editor and a copy of a task both hand over HTML: it used to be wrapped in a second paragraph,
 * which the editor opens as an empty paragraph before the text and one after it.
 */
describe('useCreateTask, the description of a new task', () => {
	beforeEach(() => {
		mockCreateTask.mockReset();
		mockCreateTask.mockResolvedValue({ data: { id: 'task-1' } });
	});

	it('keeps the HTML of a description as it is', async () => {
		const { result } = renderCreateTask();

		await act(async () => {
			await result.current.createTask({
				title: 'Draft the release notes',
				taskStatusId: 'status-open',
				description: '<p>Steps to reproduce</p>'
			});
		});

		expect(mockCreateTask).toHaveBeenCalledWith(
			expect.objectContaining({ description: '<p>Steps to reproduce</p>' })
		);
	});

	it('puts a paragraph around plain text, and sends no description for none', async () => {
		const { result } = renderCreateTask();

		await act(async () => {
			await result.current.createTask({ title: 'A', taskStatusId: 'status-open', description: 'Steps' });
			await result.current.createTask({ title: 'B', taskStatusId: 'status-open', description: '' });
		});

		expect(mockCreateTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ description: '<p>Steps</p>' }));
		expect(mockCreateTask.mock.calls[1][0]).not.toHaveProperty('description');
	});
});

/**
 * A task created with no status picked (#5682) was sent with the name of the first status of the list, "backlog", and
 * the record of another, "open": the list showed Backlog and the Kanban board put it in the Open lane.
 */
describe('useCreateTask, the status of a new task', () => {
	beforeEach(() => {
		mockCreateTask.mockReset();
		mockCreateTask.mockResolvedValue({ data: { id: 'task-1' } });
	});

	it('sends the name of the record the task is created with when no name was picked', async () => {
		const { result } = renderCreateTask();

		await act(async () => {
			await result.current.createTask({ title: 'Draft the release notes', taskStatusId: 'status-open' });
		});

		expect(mockCreateTask).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'open', taskStatusId: 'status-open' })
		);
	});

	it('sends a picked status as picked', async () => {
		const { result } = renderCreateTask();

		await act(async () => {
			await result.current.createTask({
				title: 'Draft the release notes',
				status: 'backlog',
				taskStatusId: 'status-backlog'
			});
		});

		expect(mockCreateTask).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'backlog', taskStatusId: 'status-backlog' })
		);
	});

	it('still sends the first status of the list for a record the list does not hold', async () => {
		const { result } = renderCreateTask();

		await act(async () => {
			await result.current.createTask({ title: 'Draft the release notes', taskStatusId: 'status-elsewhere' });
		});

		expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ status: 'backlog' }));
	});
});
