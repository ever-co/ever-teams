/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamTaskState, leftActiveTaskIdState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockUpdateTask = jest.fn(async () => undefined);
const mockSetActiveTask = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@headlessui/react', () => {
	const Part = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	return {
		Transition: Part,
		TransitionChild: Part,
		Dialog: Part,
		DialogPanel: Part,
		DialogTitle: Part,
		Description: Part
	};
});
jest.mock('@/core/hooks/organizations', () => ({
	useUpdateTask: () => ({ updateTask: mockUpdateTask, updateLoading: false }),
	useSetActiveTask: () => ({ setActiveTask: mockSetActiveTask })
}));

import DeleteTask from './delete-task';

/**
 * #5119: the timer stops only when the person switches to another task or leaves the active one on purpose, never when
 * the app empties the active task by itself. Closing the active task marks it as left for the timer.
 */
describe('DeleteTask, closing a task', () => {
	const taskA = { id: 'task-a', title: 'Task A' } as unknown as TTask;
	const taskB = { id: 'task-b', title: 'Task B' } as unknown as TTask;

	function renderClosing(task: TTask) {
		const store = createStore();
		store.set(activeTeamTaskState, taskA);
		render(
			<Provider store={store}>
				<DeleteTask isOpen closeModal={jest.fn()} task={task} />
			</Provider>
		);
		return store;
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('marks the active task as left when it closes it, so a timer running on it stops', async () => {
		const store = renderClosing(taskA);

		fireEvent.click(screen.getByText('common.CONFIRM'));

		await waitFor(() => expect(mockSetActiveTask).toHaveBeenCalledWith(null));
		expect(store.get(leftActiveTaskIdState)).toBe('task-a');
	});

	it('leaves the active task, and its timer, alone when it closes another task', async () => {
		const store = renderClosing(taskB);

		fireEvent.click(screen.getByText('common.CONFIRM'));

		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-b' })));
		// The close goes on after the save
		await act(async () => undefined);
		expect(mockSetActiveTask).not.toHaveBeenCalled();
		expect(store.get(leftActiveTaskIdState)).toBeNull();
	});
});
