import React, { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { translate } from '../../../i18n';
import { typography, useWebTheme } from '../../../theme';
import { authHeadingLookOf } from '../../../../src/theme/auth-look';
import { loginHeadingKeysOf } from './login-heading';

interface Props {
	withTeam: boolean;
	screenStatus: { screen: number; animation: boolean };
	workspaceScreen: boolean;
}

/** The step's heading on the page: its title, then one muted line. */
const LoginHeader: FC<Props> = ({ withTeam, screenStatus, workspaceScreen }) => {
	const look = authHeadingLookOf(useWebTheme());
	const keys = loginHeadingKeysOf(withTeam, screenStatus.screen, workspaceScreen);

	return (
		<View>
			<Text style={[styles.title, look.title]}>{translate(keys.title)}</Text>
			<Text style={[styles.hint, look.description]}>{translate(keys.hint)}</Text>
		</View>
	);
};

export default LoginHeader;

const styles = StyleSheet.create({
	hint: {
		fontFamily: typography.primary.normal
	},
	title: {
		fontFamily: typography.primary.semiBold
	}
});
