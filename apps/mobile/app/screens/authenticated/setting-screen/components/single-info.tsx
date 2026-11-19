/* eslint-disable react-native/no-color-literals */
import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, useAppTheme, useWebTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { SvgXml } from 'react-native-svg';
import { moonDarkLarge, moonLightLarge, sunDarkLarge, sunLightLarge } from '../../../../components/svgs/icons';
import { SettingsRow } from './settings-kit';

interface Props {
	title: string;
	value: string;
	disabled?: boolean;
	onPress?: () => unknown;
	onDetectTimezone?: () => unknown;
}

const SingleInfo: FC<Props> = ({ title, value, onPress, onDetectTimezone, disabled = false }) => {
	const isThemes = title === translate('settingScreen.personalSection.themes');
	const isTimeZone = title === translate('settingScreen.personalSection.timeZone');

	return (
		<SettingsRow
			label={title}
			description={limitTextCharaters({ text: value, numChars: 77 })}
			onPress={onPress}
			disabled={disabled}
			chevron={!isThemes}
			trailing={
				<>
					{isTimeZone && <DetectTimezone onDetect={onDetectTimezone} />}
					{isThemes && <ThemeToggle />}
				</>
			}
		/>
	);
};
export default SingleInfo;

function DetectTimezone({ onDetect }: { onDetect?: () => unknown }) {
	const theme = useWebTheme();
	return (
		<TouchableOpacity
			testID="detect-timezone"
			style={[styles.detect, { backgroundColor: theme.colors.muted }]}
			onPress={() => onDetect?.()}
		>
			<Text style={[styles.detectText, { color: theme.colors.foreground }]}>
				{translate('settingScreen.personalSection.detect')}
			</Text>
		</TouchableOpacity>
	);
}

function ThemeToggle() {
	const { dark } = useAppTheme();
	if (dark) {
		return (
			<View style={[styles.toggle, { backgroundColor: '#1D222A' }]}>
				<View style={styles.iconsContainer}>
					<SvgXml xml={sunDarkLarge} />
					<SvgXml xml={moonDarkLarge} />
				</View>
			</View>
		);
	}
	return (
		<View style={[styles.toggle, { backgroundColor: '#E7E7EA' }]}>
			<View style={styles.iconsContainer}>
				<View style={[styles.iconWrapper, { backgroundColor: 'white' }]}>
					<SvgXml xml={sunLightLarge} />
				</View>
				<View style={[styles.iconWrapper, { backgroundColor: 'transparent' }]}>
					<SvgXml xml={moonLightLarge} />
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	detect: {
		borderRadius: 8,
		justifyContent: 'center',
		minHeight: 32,
		paddingHorizontal: 12
	},
	detectText: {
		fontFamily: typography.primary.medium,
		fontSize: 13
	},
	iconWrapper: { borderRadius: 60, padding: 7 },
	iconsContainer: {
		alignItems: 'center',
		backgroundColor: 'transparent',
		display: 'flex',
		flexDirection: 'row',
		height: '100%',
		justifyContent: 'space-between',
		paddingLeft: 4,
		paddingRight: 4,
		width: '100%'
	},
	toggle: {
		borderRadius: 60,
		height: 40,
		width: 86
	}
});
