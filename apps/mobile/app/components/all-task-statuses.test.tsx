import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AllTaskStatuses from './all-task-statuses';
import { ITeamTask } from '../services/interfaces/ITask';

jest.mock('./label-item', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return ({ label, kind, storedIcon }: { label: string; kind: string; storedIcon?: string }) =>
		createElement(Text, { testID: 'task-chip', kind, storedIcon }, label);
});
jest.mock('./status-type', () => ({
	useTaskStatusValue: () => ({
		'in progress': {
			name: 'In Progress',
			bgColor: '#ece8fc',
			storedIcon: 'ever-icons/task-statuses/in-progress.svg'
		}
	}),
	useTaskSizeValue: () => ({ medium: { name: 'Medium', bgColor: '#f5f1cb' } }),
	useTaskPriorityValue: () => ({ high: { name: 'High', bgColor: '#e0eafc' } }),
	useTaskLabelValue: () => ({
		paint: { name: 'Paint', bgColor: '#ffd6d6' },
		outdoor: { name: 'Outdoor', bgColor: '#d6f5e3' }
	})
}));

const task = {
	status: 'in-progress',
	size: 'medium',
	priority: 'high',
	tags: [{ name: 'paint' }, { name: 'outdoor' }]
} as unknown as ITeamTask;

describe("a task's chips on a card", () => {
	it('shows every chip at once, wrapping instead of scrolling behind arrows', async () => {
		await render(<AllTaskStatuses task={task} />);

		expect(screen.getAllByTestId('task-chip').map((chip) => chip.props.children)).toEqual([
			'In Progress',
			'Medium',
			'High',
			'Paint',
			'Outdoor'
		]);
		expect(StyleSheet.flatten(screen.getByTestId('task-chips').props.style).flexWrap).toBe('wrap');
	});

	it("names the kind of each chip, so each one draws the web's glyph for it", async () => {
		await render(<AllTaskStatuses task={task} />);

		const chips = screen.getAllByTestId('task-chip');
		expect(chips.map((chip) => chip.props.kind)).toEqual(['status', 'size', 'priority', 'label', 'label']);
		expect(chips[0].props.storedIcon).toBe('ever-icons/task-statuses/in-progress.svg');
	});
});
