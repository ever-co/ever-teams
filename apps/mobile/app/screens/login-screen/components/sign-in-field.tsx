import React, { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { TextField, TextFieldProps } from '../../../components/text-field';
import { typography, useWebTheme } from '../../../theme';
import { AUTH_CONTROL_HEIGHT, authFieldBorderColorOf, authLabelLookOf } from '../../../../src/theme/auth-look';
import { inputLookOf } from '../../../../src/theme/form-look';

type SignInFieldProps = Omit<
	TextFieldProps,
	'label' | 'LabelTextProps' | 'containerStyle' | 'inputWrapperStyle' | 'placeholderTextColor'
> & { label: string };

/** A sign-in field: its label above a 44 control on the web's input. */
export const SignInField = forwardRef<TextInput, Readonly<SignInFieldProps>>(function SignInField(
	{ label, ...props },
	ref
) {
	const theme = useWebTheme();
	const input = inputLookOf(theme);
	// after the input's own border, which would hide the error one TextField sets first
	const border = { borderColor: authFieldBorderColorOf(props.status === 'error', theme) };

	return (
		<TextField
			{...props}
			ref={ref}
			label={label}
			// a screen reader names the input by its label, as the label drawn above it does
			accessibilityLabel={props.accessibilityLabel ?? label}
			LabelTextProps={{ style: [styles.label, authLabelLookOf(theme)] }}
			containerStyle={styles.container}
			placeholderTextColor={input.placeholderColor}
			inputWrapperStyle={[styles.field, input.field, border, { backgroundColor: theme.colors.background }]}
		/>
	);
});

const styles = StyleSheet.create({
	container: {
		width: '100%'
	},
	field: {
		alignItems: 'center',
		height: AUTH_CONTROL_HEIGHT,
		paddingHorizontal: 4
	},
	label: {
		fontFamily: typography.primary.medium
	}
});
