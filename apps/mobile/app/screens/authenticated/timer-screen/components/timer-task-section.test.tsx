import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TimerTaskSection from './timer-task-section';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import { RTuseTaskInput } from '../../../../services/hooks/features/use-task-input';
import { hsl, webColorTokens } from '../../../../../src/theme/tokens';
import { themeFor } from '../../../../../src/theme/use-theme';

const mockTimer = { running: false };

jest.mock('./combo-box', () => () => null);
jest.mock('../../../../models', () => ({
	useStores: () => ({ TimerStore: { localTimerStatus: mockTimer } })
}));
jest.mock('../../../../components/timer-card', () => () => null);
jest.mock('../../../../components/issues-modal', () => () => null);
jest.mock('../../../../components/task-status', () => () => null);
jest.mock('../../../../components/task-size', () => () => null);
jest.mock('../../../../components/task-priority', () => () => null);
jest.mock('../../../../components/task-labels', () => () => null);
jest.mock('./estimate-time', () => () => null);

const task = {
	id: 'task-1',
	taskNumber: '3',
	title: 'Repaint maintenance hatch',
	status: 'in-progress',
	members: []
} as unknown as ITeamTask;

const taskInput = {
	activeTask: task,
	editMode: false,
	setEditMode: jest.fn(),
	isModalOpen: false,
	hasCreateForm: false,
	createLoading: false,
	setQuery: jest.fn(),
	handleTaskCreation: jest.fn()
} as unknown as RTuseTaskInput;

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("Work's panel", () => {
	it('sits on the card surface while the timer is stopped', async () => {
		mockTimer.running = false;
		await render(<TimerTaskSection taskInput={taskInput} outsideClick={jest.fn()} />);

		expect(styleOf('work-panel').backgroundColor).toBe(themeFor('light').colors.card);
		expect(styleOf('work-panel').borderRadius).toBe(14);
	});

	it('shows the running timer with a primary tint, the task title kept readable', async () => {
		mockTimer.running = true;
		await render(<TimerTaskSection taskInput={taskInput} outsideClick={jest.fn()} />);

		expect(styleOf('work-panel').backgroundColor).toBe(hsl(webColorTokens.light.primary, 0.06));
		expect(styleOf('task-picker-field').opacity).toBeUndefined();
		expect(screen.getByTestId('task-picker-field').props.editable).toBe(false);
	});
});
