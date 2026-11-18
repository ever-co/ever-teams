/**
 * A task from the team list can come without its labels (no `tags`): choosing it in the Work tab opened the error
 * screen, since the screens read `tags.length` and `tags.map` on it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AllTaskStatuses from './all-task-statuses';
import { ITeamTask } from '../services/interfaces/ITask';

jest.mock('./status-type', () => ({
	useTaskStatusValue: () => ({ 'in progress': { name: 'In Progress' } }),
	useTaskSizeValue: () => ({ medium: { name: 'Medium' }, unnamed: {} }),
	useTaskPriorityValue: () => ({ high: { name: 'High' } }),
	useTaskLabelValue: () => ({})
}));
jest.mock('./label-item', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return ({ label }: { label?: string }) => createElement(Text, null, label ?? 'no name');
});

const taskWithoutLabels = {
	id: 'task-3',
	title: 'Repaint maintenance shed',
	status: 'in-progress',
	size: 'medium',
	priority: 'high'
} as unknown as ITeamTask;

const taskWithoutSize = {
	id: 'task-4',
	title: 'Order new gloves',
	status: 'in-progress',
	priority: 'high'
} as unknown as ITeamTask;

describe('a task without its labels', () => {
	it('shows its statuses', async () => {
		await render(<AllTaskStatuses task={taskWithoutLabels} />);

		expect(screen.getByText('In Progress')).toBeTruthy();
		expect(screen.getByText('Medium')).toBeTruthy();
		expect(screen.getByText('High')).toBeTruthy();
	});

	it('shows no entry without a name for a value the task does not have', async () => {
		await render(<AllTaskStatuses task={taskWithoutSize} />);

		expect(screen.getByText('In Progress')).toBeTruthy();
		expect(screen.getByText('High')).toBeTruthy();
		expect(screen.queryByText('no name')).toBeNull();
	});
});
