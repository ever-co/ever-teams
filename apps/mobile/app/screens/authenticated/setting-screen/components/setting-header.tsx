import React from 'react';
import { ArrowLeft, CircleAlert } from '../../../../../src/components/icons';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { translate } from '../../../../i18n';
import { typography, useWebTheme } from '../../../../theme';

const BAR_ICON_SIZE = 24;

/** Back in the bar, then the web's settings title with its one line of description. */
const SettingHeader = (props) => {
	const theme = useWebTheme();
	const { navigation } = props;
	return (
		<View style={styles.container}>
			<View style={styles.bar}>
				<TouchableOpacity
					testID="settings-back"
					accessibilityRole="button"
					accessibilityLabel={translate('common.back')}
					hitSlop={12}
					onPress={() => navigation.goBack()}
				>
					<ArrowLeft size={BAR_ICON_SIZE} color={theme.colors.foreground} />
				</TouchableOpacity>
				<CircleAlert size={BAR_ICON_SIZE} color={theme.colors['muted-foreground']} />
			</View>
			<View style={styles.heading}>
				<Text accessibilityRole="header" style={[styles.title, { color: theme.colors.foreground }]}>
					{translate('settingScreen.name')}
				</Text>
				<Text style={[styles.description, { color: theme.colors['muted-foreground'] }]}>
					{translate('settingScreen.description')}
				</Text>
			</View>
		</View>
	);
};

export default SettingHeader;

const styles = StyleSheet.create({
	bar: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		minHeight: 44
	},
	container: {
		gap: 8,
		width: '100%'
	},
	description: {
		fontFamily: typography.primary.normal,
		fontSize: 13,
		lineHeight: 17
	},
	heading: {
		gap: 4
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 20,
		lineHeight: 26
	}
});
