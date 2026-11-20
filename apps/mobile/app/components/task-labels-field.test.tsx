import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { TaskLabelsField } from './task-labels-field';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const light = themeFor('light');
const outdoor = { id: 'label-1', name: 'outdoor', color: '#16a34a' };
const nightShift = { id: 'label-2', name: 'night shift', color: '#7c3aed' };

function drawField(labels: (typeof outdoor)[]) {
	const onOpen = jest.fn();
	const anchorRef = React.createRef<View>();
	const drawing = render(<TaskLabelsField labels={labels} anchorRef={anchorRef} onOpen={onOpen} />);
	return { drawing, onOpen, anchorRef };
}

describe("a task's labels on the task page", () => {
	it('offers to add a label while the task has none, and opens the menu under it', async () => {
		const { drawing, onOpen, anchorRef } = drawField([]);
		await drawing;

		expect(screen.getByText('taskMenus.addLabel undefined')).toHaveStyle({
			color: light.colors['muted-foreground'],
			fontSize: 13
		});
		expect(screen.queryByTestId('task-label-chip')).toBeNull();

		await fireEvent.press(screen.getByRole('button', { name: 'taskMenus.addLabel undefined' }));

		expect(onOpen).toHaveBeenCalledWith();
		expect(anchorRef.current).not.toBeNull();
	});

	it("draws each label as the web's chip, its name capitalized, then the dashed add button", async () => {
		const { drawing } = drawField([outdoor, nightShift]);
		await drawing;

		expect(screen.getAllByTestId('task-label-chip')).toHaveLength(2);
		expect(StyleSheet.flatten(screen.getAllByTestId('task-label-chip')[0].props.style)).toMatchObject({
			borderRadius: 6,
			height: 28
		});
		expect(screen.getByText('night shift')).toHaveStyle({ fontSize: 12, textTransform: 'capitalize' });
		expect(StyleSheet.flatten(screen.getByTestId('task-labels-add').props.style)).toMatchObject({
			borderStyle: 'dashed',
			height: 28,
			width: 28
		});
		expect(screen.getByRole('button', { name: 'taskMenus.editLabels undefined' })).toBeTruthy();
	});

	it('opens the menu under the label tapped, or under the add button', async () => {
		const { drawing, onOpen } = drawField([outdoor]);
		await drawing;

		await fireEvent.press(screen.getByRole('button', { name: 'outdoor' }));
		expect(onOpen).toHaveBeenLastCalledWith(expect.anything());

		await fireEvent.press(screen.getByRole('button', { name: 'taskMenus.editLabels undefined' }));
		expect(onOpen).toHaveBeenLastCalledWith();
	});
});
