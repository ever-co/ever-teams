import React, { FC } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, useAppTheme, useWebTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { SettingsRow, SettingsSwitch } from './settings-kit';

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
					{isThemes && <ThemeSwitch label={title} onPress={onPress} />}
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

function ThemeSwitch({ label, onPress }: { label: string; onPress?: () => unknown }) {
	const { dark } = useAppTheme();
	return <SettingsSwitch value={dark} onPress={onPress} accessibilityLabel={label} />;
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
	}
});
