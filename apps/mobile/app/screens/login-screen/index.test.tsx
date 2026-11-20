import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { LoginScreen } from './index';

// The page draws through stand-ins: the test reads how the screen around the steps scrolls
jest.mock('../../components', () => {
	const mockReact = jest.requireActual('react');
	const { View: MockView } = jest.requireActual('react-native');
	return {
		Screen: ({
			preset,
			contentContainerStyle,
			children
		}: {
			preset?: string;
			contentContainerStyle: unknown;
			children: React.ReactNode;
		}) =>
			mockReact.createElement(
				MockView,
				{ testID: 'screen', accessibilityHint: preset ?? 'fixed', style: contentContainerStyle },
				children
			)
	};
});
jest.mock('../../services/hooks/features/use-authentication-team', () => ({
	useAuthenticationTeam: () => ({ screenstatus: { screen: 1, animation: false }, withteam: true, isLoading: false })
}));
jest.mock('./components/pass-code', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/fill-team-name-form', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/fill-user-info-form', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/email-verification-form', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/login-header', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/login-bottom', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-svg', () => ({ SvgXml: () => null }));
jest.mock('../../theme', () => ({
	spacing: { large: 24 },
	useWebTheme: () => jest.requireActual('../../../src/theme/use-theme').themeFor('light')
}));

type ScreenProps = React.ComponentProps<typeof LoginScreen>;

describe('the sign-in page', () => {
	it('scrolls once its content runs past the screen, growing with it', async () => {
		await render(<LoginScreen {...({} as ScreenProps)} />);

		const page = screen.getByTestId('screen');
		expect(page.props.accessibilityHint).toBe('auto');
		const content = StyleSheet.flatten(page.props.style);
		expect(content.flexGrow).toBe(1);
		expect(content.height).toBeUndefined();
	});
});
