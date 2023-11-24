/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, PixelRatio, Platform } from 'react-native';
import { colors, typography, useAppTheme } from '../theme';
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from 'react-native-confirmation-code-field';

interface ICodeField {
	onChange: (e: any) => void;
	editable: boolean;
	length?: number;
	defaultValue?: string;
}

const { height: screeHeight } = Dimensions.get('screen');
const screenDimension = PixelRatio.get();

export const CodeInputField: FC<ICodeField> = (props) => {
	const { onChange, editable, length = 6 } = props;
	const { colors } = useAppTheme();

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
			onChangeText={setValue}
			cellCount={length}
			rootStyle={styles.container}
			keyboardType="default"
			textContentType="oneTimeCode"
			renderCell={({ index, symbol, isFocused }) => (
				<View key={index} style={styles.inputContainer}>
					<Text
						style={[
							styles.inputStyle,
							{
								borderColor: isFocused ? colors.primary : colors.border,
								backgroundColor: colors.background,
								color: colors.primary,
								textAlignVertical: 'center',
								flexDirection: 'column',
								justifyContent: 'center',
								alignItems: 'center',
								lineHeight:
									Platform.OS === 'ios' ? screeHeight * 0.055 * (screenDimension / 3) : undefined
							}
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
	container: {
		flexDirection: 'row',
		justifyContent: 'center',
		width: '100%'
	},
	inputContainer: {
		backgroundColor: '#fff',
		borderRadius: 10,
		marginHorizontal: 4,
		width: '14.6%'
	},
	inputStyle: {
		backgroundColor: '#fff',
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 10,
		borderWidth: 1,
		color: colors.primary,
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		height: 53,
		textAlign: 'center',
		width: '100%'
	}
});
