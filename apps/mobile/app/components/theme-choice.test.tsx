import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeChoice } from './theme-choice';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

jest.mock('../i18n', () => ({ translate: (key: string) => key }));

const mockStore = { themePreference: 'system', setThemePreference: jest.fn() };
jest.mock('../models', () => ({ useStores: () => ({ authenticationStore: mockStore }) }));

const light = themeFor('light');

describe('the theme choice of the menu', () => {
	beforeEach(() => {
		mockStore.themePreference = 'system';
		mockStore.setThemePreference.mockClear();
	});

	it("raises the person's choice on the card and leaves the others muted", async () => {
		await render(<ThemeChoice />);

		expect(screen.getByTestId('theme-system').props.accessibilityState.checked).toBe(true);
		expect(StyleSheet.flatten(screen.getByTestId('theme-system').props.style).backgroundColor).toBe(
			light.colors.card
		);
		expect(StyleSheet.flatten(screen.getByText('hamburgerMenu.themeDark').props.style).color).toBe(
			light.colors['muted-foreground']
		);
	});

	it('keeps the theme the person picks', async () => {
		await render(<ThemeChoice />);

		await fireEvent.press(screen.getByText('hamburgerMenu.themeDark'));

		expect(mockStore.setThemePreference).toHaveBeenCalledWith('dark');
	});
});
