import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import LoginBottom from './login-bottom';

jest.mock('../../../models', () => {
	const stores = { authenticationStore: { toggleTheme: jest.fn() } };
	return { useStores: () => stores };
});
jest.mock('../../../config', () => ({ __esModule: true, default: { branding: { copyrightText: '© Ever Teams' } } }));
jest.mock('react-native-svg', () => ({ SvgXml: () => null }));
jest.mock('../../../theme', () => ({
	...jest.requireActual('../../../theme/typography'),
	useAppTheme: () => ({ dark: false, colors: {} }),
	useWebTheme: () => jest.requireActual('../../../../src/theme/use-theme').themeFor('light')
}));

describe("the sign-in page's footer", () => {
	it('sits in the flow below the form, never laid over it', async () => {
		await render(<LoginBottom />);

		const footer = StyleSheet.flatten(screen.getByTestId('login-footer').props.style);
		expect(footer.position).not.toBe('absolute');
		expect(footer.zIndex).toBeUndefined();
		expect(footer.width).toBe('100%');
		expect(screen.getByText('© Ever Teams')).toBeTruthy();
	});
});
