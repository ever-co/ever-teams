/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { typography, useAppTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { SvgXml } from 'react-native-svg';
import { moonDarkLarge, moonLightLarge, sunDarkLarge, sunLightLarge } from '../../../../components/svgs/icons';

interface Props {
	title: string;
	value: string;
	disabled?: boolean;
	onPress?: () => unknown;
	onDetectTimezone?: () => unknown;
}
const SingleInfo: FC<Props> = ({ title, value, onPress, onDetectTimezone, disabled = false }) => {
	const { colors, dark } = useAppTheme();

	return (
		<View style={styles.container}>
			<View style={styles.wrapperInfo}>
				<Text style={[styles.infoTitle, { color: colors.primary }]}>{title}</Text>
				<Text style={[styles.infoText, { color: colors.tertiary }]}>
					{limitTextCharaters({ text: value, numChars: 77 })}
				</Text>
			</View>
			{title === translate('settingScreen.personalSection.timeZone') ? (
				<TouchableOpacity
					style={[styles.detectWrapper, { backgroundColor: dark ? '#3D4756' : '#E6E6E9' }]}
					onPress={() => (onDetectTimezone ? onDetectTimezone() : {})}
				>
					<Text style={[styles.infoTitle, { fontSize: 12, color: colors.primary }]}>
						{translate('settingScreen.personalSection.detect')}
					</Text>
				</TouchableOpacity>
			) : null}

			{title !== translate('settingScreen.personalSection.themes') ? (
				<TouchableOpacity
					disabled={disabled}
					style={{ opacity: disabled ? 0.5 : 1 }}
					onPress={() => (onPress ? onPress() : {})}
				>
					<AntDesign name="right" size={24} color="#938FA4" />
				</TouchableOpacity>
			) : (
				<TouchableOpacity
					style={[styles.toggle, dark ? { backgroundColor: '#1D222A' } : { backgroundColor: '#E7E7EA' }]}
					onPress={() => (onPress ? onPress() : {})}
				>
					{dark ? (
						<View style={styles.iconsContainer}>
							<SvgXml xml={sunDarkLarge} />
							<SvgXml xml={moonDarkLarge} />
						</View>
					) : (
						<View style={styles.iconsContainer}>
							<View style={[styles.iconWrapper, { backgroundColor: 'white' }]}>
								<SvgXml xml={sunLightLarge} />
							</View>
							<View style={[styles.iconWrapper, { backgroundColor: 'transparent' }]}>
								<SvgXml xml={moonLightLarge} />
							</View>
						</View>
					)}
				</TouchableOpacity>
			)}
		</View>
	);
};
export default SingleInfo;

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 32,
		width: '100%'
	},
	detectWrapper: {
		borderRadius: 8,
		paddingHorizontal: 13,
		paddingVertical: 8
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
	infoText: {
		color: '#938FA4',
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginTop: 10
	},
	infoTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	toggle: {
		borderRadius: 60,
		height: 40,
		right: 0,
		top: 3,
		width: 86
	},

	wrapperInfo: {
		maxWidth: '90%'
	}
});
