import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ACTIONS_MENU_WIDTH, ActionsMenu } from './actions-menu';
import { Pencil, Trash } from '../../src/components/icons';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const light = themeFor('light');
const anchor = { x: 320, y: 200, width: 28, height: 28 };

function actionsWith(edit: () => unknown, remove: () => unknown, disabled = false) {
	return [
		{ key: 'edit', label: 'Edit', icon: Pencil, onPress: edit, disabled },
		{
			key: 'delete',
			label: 'Delete',
			icon: Trash,
			onPress: remove,
			tone: 'destructive' as const,
			disabled,
			separated: true
		}
	];
}

describe("a row's actions menu", () => {
	it('runs the action pressed and closes', async () => {
		const edit = jest.fn();
		const dismiss = jest.fn();
		await render(<ActionsMenu anchor={anchor} actions={actionsWith(edit, jest.fn())} onDismiss={dismiss} />);

		await fireEvent.press(screen.getByLabelText('Edit'));

		expect(edit).toHaveBeenCalledTimes(1);
		expect(dismiss).toHaveBeenCalledTimes(1);
	});

	it("is the web's 208 wide, Delete set apart in destructive-ink", async () => {
		await render(<ActionsMenu anchor={anchor} actions={actionsWith(jest.fn(), jest.fn())} onDismiss={jest.fn()} />);

		expect(StyleSheet.flatten(screen.getByTestId('actions-menu').props.style).width).toBe(ACTIONS_MENU_WIDTH);
		expect(screen.getByTestId('icon-Trash')).toHaveStyle({ color: light.colors['destructive-ink'] });
		expect(screen.getByTestId('actions-menu-separator')).toBeTruthy();
	});

	it('says why its actions are out of reach, and runs none of them', async () => {
		const edit = jest.fn();
		await render(
			<ActionsMenu
				anchor={anchor}
				actions={actionsWith(edit, jest.fn(), true)}
				hint="Only team managers can change these settings."
				onDismiss={jest.fn()}
			/>
		);

		await fireEvent.press(screen.getByLabelText('Edit'));

		expect(edit).not.toHaveBeenCalled();
		expect(screen.getByLabelText('Edit')).toBeDisabled();
		expect(screen.getByText('Only team managers can change these settings.')).toBeTruthy();
	});

	it('closes on a tap outside it', async () => {
		const dismiss = jest.fn();
		await render(<ActionsMenu anchor={anchor} actions={actionsWith(jest.fn(), jest.fn())} onDismiss={dismiss} />);

		await fireEvent.press(screen.getByTestId('menu-backdrop'));

		expect(dismiss).toHaveBeenCalledTimes(1);
	});
});
