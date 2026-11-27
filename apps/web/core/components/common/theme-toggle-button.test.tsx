/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

const mockSetTheme = jest.fn();
let mockResolvedTheme = 'light';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next-themes', () => ({
	useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme: mockSetTheme, theme: 'system' })
}));

import { ThemeToggleButton } from './theme-toggle-button';

beforeEach(() => {
	mockSetTheme.mockReset();
});

describe('the theme button of the top bar', () => {
	it('offers the dark theme in light mode, and picks it on a click', () => {
		mockResolvedTheme = 'light';
		render(<ThemeToggleButton />);

		fireEvent.click(screen.getByRole('button', { name: 'common.SWITCH_TO_DARK_THEME' }));

		expect(mockSetTheme).toHaveBeenCalledWith('dark');
	});

	it('offers the light theme in dark mode, also when the dark theme comes from the system', () => {
		mockResolvedTheme = 'dark';
		render(<ThemeToggleButton />);

		fireEvent.click(screen.getByRole('button', { name: 'common.SWITCH_TO_LIGHT_THEME' }));

		expect(mockSetTheme).toHaveBeenCalledWith('light');
	});

	it('is a single button, never a row of theme icons', () => {
		mockResolvedTheme = 'light';
		render(<ThemeToggleButton />);

		expect(screen.getAllByRole('button')).toHaveLength(1);
	});
});
