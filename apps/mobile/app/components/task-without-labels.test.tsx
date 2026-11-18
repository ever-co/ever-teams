/**
 * A task from the team list can come without its labels (no `tags`): choosing it in the Work tab opened the error
 * screen, since the screens read `tags.length` and `tags.map` on it.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import AllTaskStatuses from './all-task-statuses';
import { ITeamTask } from '../services/interfaces/ITask';

jest.mock('./status-type', () => ({
	useTaskStatusValue: () => ({}),
	useTaskSizeValue: () => ({}),
	useTaskPriorityValue: () => ({}),
	useTaskLabelValue: () => ({})
}));
jest.mock('./label-item', () => () => null);

const taskWithoutLabels = {
	id: 'task-3',
	title: 'Repaint maintenance shed',
	status: 'in-progress',
	size: 'medium',
	priority: 'medium'
} as unknown as ITeamTask;

describe('a task without its labels', () => {
	it('shows its statuses', async () => {
		await expect(render(<AllTaskStatuses task={taskWithoutLabels} />)).resolves.toBeTruthy();
	});
});
