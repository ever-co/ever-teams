import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskLabelPopup, { toggledLabels } from './task-label-popup';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';

const PAINT = { id: 'paint', name: 'Paint', color: '#ffd6d6' } as ITaskLabelItem;
const OUTDOOR = { id: 'outdoor', name: 'outdoor work', color: '#d6f5e3' } as ITaskLabelItem;

jest.mock('../services/hooks/features/use-task-labels', () => ({
	useTaskLabels: () => ({ allTaskLabels: [PAINT, OUTDOOR], createLabel: jest.fn() })
}));
jest.mock('../screens/authenticated/task-label-screen/components/task-label-form', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return { __esModule: true, default: () => <MockText>label form</MockText> };
});
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const CHIP = { x: 16, y: 300, width: 120, height: 30 };

async function renderLabels(selectedLabels: ITaskLabelItem[]) {
	const onToggleLabel = jest.fn();
	const onDismiss = jest.fn();
	await render(
		<TaskLabelPopup
			visible
			onDismiss={onDismiss}
			selectedLabels={selectedLabels}
			onToggleLabel={onToggleLabel}
			canCreateLabel
			anchor={CHIP}
		/>
	);
	return { onToggleLabel, onDismiss };
}

describe("a task's labels menu", () => {
	it('lists the labels under their saved names, the ones the task holds checked', async () => {
		await renderLabels([PAINT]);

		expect(screen.getByTestId('property-menu')).toBeTruthy();
		expect(screen.getByPlaceholderText('taskMenus.search.label undefined')).toBeTruthy();
		expect(screen.getByLabelText('Paint')).toBeSelected();
		expect(screen.getByLabelText('outdoor work')).not.toBeSelected();
		expect(screen.getByText('outdoor work')).not.toHaveStyle({ textTransform: 'capitalize' });
	});

	it('hands each tapped label over and stays open for the next one', async () => {
		const { onToggleLabel, onDismiss } = await renderLabels([PAINT]);

		await fireEvent.press(screen.getByLabelText('outdoor work'));
		await fireEvent.press(screen.getByLabelText('Paint'));

		expect(onToggleLabel.mock.calls.map(([label]) => label.id)).toEqual(['outdoor', 'paint']);
		expect(onDismiss).not.toHaveBeenCalled();
		expect(screen.getByTestId('property-menu')).toBeTruthy();
	});

	it('opens the create form from its action, in the dialog', async () => {
		await renderLabels([]);

		await fireEvent.press(screen.getByLabelText('taskMenus.actions.createLabel undefined'));

		expect(screen.getByText('label form')).toBeTruthy();
		expect(screen.getByTestId('picker-dialog')).toBeTruthy();
	});
});

describe('a label tapped in the menu', () => {
	it('joins the labels the task holds, or leaves them when it was there', () => {
		expect(toggledLabels([PAINT], OUTDOOR).map((label) => label.id)).toEqual(['paint', 'outdoor']);
		expect(toggledLabels([PAINT, OUTDOOR], PAINT).map((label) => label.id)).toEqual(['outdoor']);
	});
});
