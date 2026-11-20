import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SignInField } from './sign-in-field';
import { themeFor } from '../../../../src/theme/use-theme';

// The shared field as a stand-in that draws its label and its control, with the styles sign-in gives them
jest.mock('../../../components/text-field', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText, View: MockView } = jest.requireActual('react-native');
	return {
		TextField: mockReact.forwardRef(
			(
				props: {
					label: string;
					LabelTextProps: { style: unknown };
					inputWrapperStyle: unknown;
					testID?: string;
				},
				_ref: unknown
			) =>
				mockReact.createElement(
					MockView,
					null,
					mockReact.createElement(MockText, { style: props.LabelTextProps.style }, props.label),
					mockReact.createElement(MockView, { testID: props.testID, style: props.inputWrapperStyle })
				)
		)
	};
});
jest.mock('../../../theme', () => ({
	typography: { primary: { medium: 'medium' } },
	useWebTheme: () => jest.requireActual('../../../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');

describe('a sign-in field', () => {
	it('puts its 13 label in the foreground above a 44 control on the input border', async () => {
		await render(<SignInField label="Enter Email" testID="sign-in-email" />);

		expect(StyleSheet.flatten(screen.getByText('Enter Email').props.style)).toMatchObject({
			color: dark.colors.foreground,
			fontSize: 13
		});
		expect(StyleSheet.flatten(screen.getByTestId('sign-in-email').props.style)).toMatchObject({
			borderColor: dark.colors.input,
			borderRadius: 8,
			height: 44
		});
	});
});
