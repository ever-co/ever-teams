import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SelectedMark } from './selected-mark';
import { taskChipLookOf } from './task-chip';
import { themeFor } from '../theme/use-theme';

jest.mock('./icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../../app/theme', () => ({
	useWebTheme: () => jest.requireActual('../theme/use-theme').themeFor('light')
}));

const light = themeFor('light');

describe("the web's mark of a selected option", () => {
	it('is a round 18 chip-3d of the primary color around a check in its ink', async () => {
		await render(<SelectedMark />);
		const look = taskChipLookOf(light.colors.primary, light);

		expect(StyleSheet.flatten(screen.getByTestId('selected-mark').props.style)).toMatchObject({
			borderRadius: 9,
			height: 18,
			width: 18,
			borderColor: look.container.borderColor
		});
		expect(look.container.borderColor).not.toBe(light.colors.input);
		expect(screen.getByTestId('icon-Check')).toHaveStyle({ color: look.ink, fontSize: 12 });
	});
});
