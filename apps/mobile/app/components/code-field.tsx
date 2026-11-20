import React, { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { typography, useWebTheme } from '../theme';
import { AUTH_CODE_SLOT_SIZE, authCodeSlotLookOf } from '../../src/theme/auth-look';
import { EMAILED_CODE_LENGTH, normalizeEmailedCode } from '../helpers/emailed-code';
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from 'react-native-confirmation-code-field';

interface ICodeField {
	onChange: (e: any) => void;
	editable: boolean;
	length?: number;
	defaultValue?: string;
}

// iOS centers one line only through its line height: the slot's height inside its two border lines
const SLOT_LINE_HEIGHT = Platform.select({ ios: AUTH_CODE_SLOT_SIZE - 2, default: undefined });

export const CodeInputField: FC<ICodeField> = (props) => {
	const { onChange, editable, length = EMAILED_CODE_LENGTH } = props;
	const theme = useWebTheme();

	const [value, setValue] = useState<string>('');

	const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
		value,
		setValue
	});

	useEffect(() => {
		onChange(value);
	}, [value]);

	const ref = useBlurOnFulfill({ value, cellCount: length });

	return (
		<CodeField
			editable={editable}
			ref={ref}
			{...codeFieldProps}
			// Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
			value={value}
			// The library caps the hidden input at cellCount characters, which cuts a code pasted with a space before
			// it short before onChangeText sees it: take the whole text and keep the code part of it here.
			maxLength={undefined}
			onChangeText={(text: string) => setValue(normalizeEmailedCode(text, length))}
			cellCount={length}
			testID="emailed-code-input"
			autoFocus
			textInputStyle={styles.hiddenInput}
			rootStyle={styles.container}
			keyboardType="default"
			textContentType="oneTimeCode"
			renderCell={({ index, symbol, isFocused }) => (
				<View key={index} style={styles.inputContainer}>
					<Text
						testID={`emailed-code-slot-${index}`}
						style={[
							styles.inputStyle,
							authCodeSlotLookOf(isFocused, theme),
							{ lineHeight: SLOT_LINE_HEIGHT }
						]}
						onLayout={getCellOnLayoutHandler(index)}
					>
						{symbol || (isFocused ? <Cursor /> : null)}
					</Text>
				</View>
			)}
		/>
	);
};

const styles = StyleSheet.create({
	// The library spreads StyleSheet.absoluteFillObject, which React Native 0.86 no longer exports: its hidden input then
	// sits at the end of the row, a few pixels wide, and a press on a cell focuses nothing. This lays it over the cells.
	hiddenInput: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	},
	container: {
		flexDirection: 'row',
		gap: 6,
		justifyContent: 'space-between',
		width: '100%'
	},
	inputContainer: {
		flex: 1,
		maxWidth: AUTH_CODE_SLOT_SIZE
	},
	inputStyle: {
		fontFamily: typography.primary.medium,
		fontSize: 16,
		textAlign: 'center',
		textAlignVertical: 'center',
		width: '100%'
	}
});
