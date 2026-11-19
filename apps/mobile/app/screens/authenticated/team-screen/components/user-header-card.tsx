/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, View, Text } from 'react-native';
import React, { FC } from 'react';
import { IUser } from '../../../../services/interfaces/IUserData';
import { Avatar } from 'react-native-paper';
import { typography, useWebTheme } from '../../../../theme';
import { presenceColorOf, presenceInkOf } from '../../../../../src/theme/presence';
import type { Theme } from '../../../../../src/theme/use-theme';
import { OT_Member } from '../../../../services/interfaces/IOrganizationTeam';
import { useTimer } from '../../../../services/hooks/use-timer';
import { imgTitleProfileAvatar } from '../../../../helpers/img-title-profile-avatar';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { getTimerStatusValue } from '../../../../helpers/get-timer-status';
import { SvgXml } from 'react-native-svg';
import {
	idleStatusIcon,
	onlineAndTrackingTimeAlternate,
	// onlineAndTrackingTimeStatusIcon,
	pauseStatusIcon,
	suspendedStatusIcon
} from '../../../../components/svgs/icons';

interface ITimerStatus {
	status: 'running' | 'online' | 'idle' | 'suspended' | 'pause';
	theme: Theme;
}
/** The presence icons carry the dark shade of their old pastel; on the badge they take the ink of their fill. */
export function presenceIconXml(xml: string): string {
	return xml.replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="currentColor"');
}

/**
 * The presence badge on the avatar: the web's presence color on an opaque base of the card's color, so a translucent
 * presence (idle, suspended) never lets the avatar show through, and ringed with the card's color.
 */
const TimerStatus: FC<ITimerStatus> = ({ status, theme }) => {
	let iconSvgXml = '';

	switch (status) {
		case 'online':
			iconSvgXml = onlineAndTrackingTimeAlternate;
			break;
		case 'pause':
			iconSvgXml = pauseStatusIcon;
			break;
		case 'idle':
			iconSvgXml = idleStatusIcon;
			break;
		case 'suspended':
			iconSvgXml = suspendedStatusIcon;
			break;
	}

	return (
		<View
			testID="presence-badge"
			style={[styles.statusIcon, { borderColor: theme.colors.card, backgroundColor: theme.colors.card }]}
		>
			<View
				testID="presence-fill"
				style={[styles.presenceFill, { backgroundColor: presenceColorOf(status, theme) }]}
			>
				<SvgXml xml={presenceIconXml(iconSvgXml)} color={presenceInkOf(status, theme)} />
			</View>
		</View>
	);
};

const UserHeaderCard = ({ member, user }: { member: OT_Member; user: IUser }) => {
	const theme = useWebTheme();
	const { currentTeam } = useOrganizationTeam();

	const currentMember = currentTeam?.members.find((currentMember) => currentMember.id === member.id);

	const { timerStatus } = useTimer();

	return (
		<View style={styles.wrapProfileImg}>
			{user?.image?.thumbUrl || user?.imageUrl || user?.image?.fullUrl ? (
				<Avatar.Image
					style={styles.teamImage}
					size={40}
					source={{
						uri: user?.image?.thumbUrl || user?.imageUrl || user?.image?.fullUrl
					}}
				/>
			) : (
				<Avatar.Text
					style={styles.teamImage}
					size={40}
					label={imgTitleProfileAvatar(user?.name)}
					labelStyle={styles.prefix}
				/>
			)}
			<TimerStatus status={getTimerStatusValue(timerStatus, currentMember, currentTeam?.public)} theme={theme} />
			<Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
				{user?.name}
			</Text>
		</View>
	);
};

export default UserHeaderCard;

const styles = StyleSheet.create({
	// The web's member name: 14/500
	name: {
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 14,
		fontWeight: '500',
		left: 15,
		maxWidth: '70%'
	},
	prefix: {
		color: '#FFFFFF',
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 26,
		fontWeight: '200'
	},
	presenceFill: {
		borderRadius: 100,
		padding: 3
	},
	statusIcon: {
		borderRadius: 100,
		borderWidth: 2,
		marginLeft: -13,
		top: 10
	},
	teamImage: {
		backgroundColor: '#82c9e0'
	},
	wrapProfileImg: {
		alignItems: 'center',
		flexDirection: 'row'
	}
});
