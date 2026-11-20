import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SignInStep } from './sign-in-step';
import { themeFor } from '../../../../src/theme/use-theme';

jest.mock('../../../../src/components/icons', () =>
	jest.requireActual('../../../../test/icons-stand-in').iconsStandIn()
);
jest.mock('../../../i18n', () => ({ translate: (key: string) => key }));
jest.mock('../../../theme', () => ({
	typography: { primary: { medium: 'medium', semiBold: 'semiBold' } },
	useWebTheme: () => jest.requireActual('../../../../src/theme/use-theme').themeFor('light')
}));

const light = themeFor('light');

function submitOf(overrides: Partial<React.ComponentProps<typeof SignInStep>['submit']> = {}) {
	return {
		label: 'Continue',
		onPress: jest.fn(),
		disabled: false,
		isLoading: false,
		testID: 'sign-in-continue',
		...overrides
	};
}

describe('a step of sign-in', () => {
	it('goes back from a quiet link above the heading', async () => {
		const onBack = jest.fn();
		await render(
			<SignInStep heading={<Text>Login</Text>} onBack={onBack} backTestID="sign-in-back" submit={submitOf()}>
				<Text>Email</Text>
			</SignInStep>
		);

		await fireEvent.press(screen.getByTestId('sign-in-back'));

		expect(onBack).toHaveBeenCalledTimes(1);
		expect(StyleSheet.flatten(screen.getByText('common.back').props.style).color).toBe(
			light.colors['muted-foreground']
		);
		expect(screen.getByTestId('icon-ArrowLeft')).toHaveStyle({
			color: light.colors['muted-foreground'],
			fontSize: 14
		});
	});

	it('sends the step from a full-width primary pill', async () => {
		const submit = submitOf();
		await render(
			<SignInStep submit={submit}>
				<Text>Email</Text>
			</SignInStep>
		);

		await fireEvent.press(screen.getByTestId('sign-in-continue'));

		expect(submit.onPress).toHaveBeenCalledTimes(1);
		const pill = StyleSheet.flatten(screen.getByTestId('sign-in-continue').props.style);
		expect(pill).toMatchObject({ backgroundColor: light.colors.primary, height: 44, opacity: 1, width: '100%' });
	});

	it('fades the pill and ignores a press while the step cannot be sent', async () => {
		const submit = submitOf({ disabled: true });
		await render(
			<SignInStep submit={submit}>
				<Text>Email</Text>
			</SignInStep>
		);

		await fireEvent.press(screen.getByTestId('sign-in-continue'));

		expect(submit.onPress).not.toHaveBeenCalled();
		expect(StyleSheet.flatten(screen.getByTestId('sign-in-continue').props.style).opacity).toBe(0.5);
	});

	it('keeps its label, fades and takes no second press while the request is under way', async () => {
		const submit = submitOf({ isLoading: true });
		await render(
			<SignInStep submit={submit}>
				<Text>Email</Text>
			</SignInStep>
		);

		await fireEvent.press(screen.getByTestId('sign-in-continue'));

		expect(submit.onPress).not.toHaveBeenCalled();
		expect(screen.getByText('Continue')).toBeTruthy();
		expect(StyleSheet.flatten(screen.getByTestId('sign-in-continue').props.style).opacity).toBe(0.5);
	});
});
