/**
 * Choosing a task without labels (no `tags`) in the Work tab's list opened the error screen:
 * "Cannot read property 'length' of undefined".
 */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TimerTaskSection from './timer-task-section';
import type { Props as TaskListProps } from './combo-box';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import { RTuseTaskInput } from '../../../../services/hooks/features/use-task-input';

// The list's own rows do not compile under the strict type check ts-jest runs on the files a test loads, so a row
// here does what the real one does when pressed: it makes the task active, closes the list and leaves edit mode.
jest.mock('./combo-box', () => {
	const { createElement } = jest.requireActual('react');
	const { Pressable, Text, View } = jest.requireActual('react-native');

	function TaskList({ tasksHandler, closeCombo, setEditMode }: TaskListProps) {
		const rows = tasksHandler.filteredTasks.map((task) => {
			const choose = () => {
				tasksHandler.setActiveTeamTask(task);
				closeCombo();
				setEditMode(false);
			};
			return createElement(
				Pressable,
				{ key: task.id, testID: 'task-picker-option', onPress: choose },
				createElement(Text, null, task.title)
			);
		});
		return createElement(View, null, rows);
	}
	return TaskList;
});
jest.mock('../../../../models', () => ({
	useStores: () => ({ TimerStore: { localTimerStatus: { running: false } } })
}));
jest.mock('../../../../components/timer-card', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return () => createElement(Text, { testID: 'timer-card' }, 'Start');
});
jest.mock('../../../../components/issues-modal', () => () => null);
jest.mock('../../../../components/task-status', () => () => null);
jest.mock('../../../../components/task-size', () => () => null);
jest.mock('../../../../components/task-priority', () => () => null);
jest.mock('../../../../components/task-labels', () => () => null);
jest.mock('./estimate-time', () => () => null);

const taskWithoutLabels = {
	id: 'task-3',
	taskNumber: '3',
	title: 'Repaint maintenance shed',
	status: 'open',
	members: []
} as unknown as ITeamTask;

function WorkTab() {
	const [activeTask, setActiveTask] = useState<ITeamTask | null>(null);
	const [editMode, setEditMode] = useState(true);
	const taskInput = {
		activeTask,
		editMode,
		setEditMode,
		setActiveTeamTask: setActiveTask,
		filteredTasks: [taskWithoutLabels],
		isModalOpen: false,
		hasCreateForm: false,
		createLoading: false,
		setQuery: jest.fn(),
		handleTaskCreation: jest.fn()
	} as unknown as RTuseTaskInput;
	return <TimerTaskSection taskInput={taskInput} outsideClick={jest.fn()} />;
}

describe('the Work tab', () => {
	it('takes a task without labels chosen in the list', async () => {
		await render(<WorkTab />);

		await fireEvent.press(screen.getByTestId('task-picker-option'));

		expect(screen.queryByTestId('task-picker-option')).toBeNull();
		expect(screen.getByTestId('task-picker-field').props.defaultValue).toBe('Repaint maintenance shed');
		expect(screen.getByTestId('timer-card')).toBeTruthy();
	});
});
