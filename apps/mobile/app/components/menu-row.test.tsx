import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { MenuRow, menuRowLookOf } from './menu-row';
import { Users } from '../../src/components/icons';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const dark = themeFor('dark');

describe('a row of the menu', () => {
	it("tints the current screen's row with the accent", () => {
		expect(menuRowLookOf(true, 'default', dark).row.backgroundColor).toBe(dark.colors.accent);
		expect(menuRowLookOf(false, 'default', dark).row.backgroundColor).toBeUndefined();
	});

	it('draws Log out in destructive-ink, never in a pink literal', () => {
		const look = menuRowLookOf(false, 'danger', dark);

		expect(look.labelColor).toBe(dark.colors['destructive-ink']);
		expect(look.iconColor).toBe(dark.colors['destructive-ink']);
	});

	it('is 48 tall and opens its screen', async () => {
		const open = jest.fn();
		await render(<MenuRow testID="menu-team" icon={Users} label="Teams" onPress={open} />);

		await fireEvent.press(screen.getByText('Teams'));

		expect(open).toHaveBeenCalledTimes(1);
		expect(StyleSheet.flatten(screen.getByTestId('menu-team').props.style).minHeight).toBe(48);
	});

	it("draws its icon from the web's family, in the row's ink", async () => {
		await render(<MenuRow testID="menu-team" icon={Users} label="Teams" onPress={jest.fn()} />);

		expect(screen.getByTestId('icon-Users')).toHaveStyle({
			color: menuRowLookOf(false, 'default', dark).iconColor
		});
	});
});
