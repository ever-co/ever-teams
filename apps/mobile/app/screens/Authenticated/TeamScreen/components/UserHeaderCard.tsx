/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, View, Text } from 'react-native';
import React, { FC } from 'react';
import { IUser } from '../../../../services/interfaces/IUserData';
import { Avatar } from 'react-native-paper';
import { typography, useAppTheme } from '../../../../theme';
import { OT_Member } from '../../../../services/interfaces/IOrganizationTeam';
import { useTimer } from '../../../../services/hooks/useTimer';
import { imgTitleProfileAvatar } from '../../../../helpers/img-title-profile-avatar';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { getTimerStatusValue } from '../../../../helpers/get-timer-status';
import { SvgXml } from 'react-native-svg';
import {
	idleStatusIcon,
	onlineAndTrackingTimeStatusIcon,
	pauseStatusIcon,
	suspendedStatusIcon
} from '../../../../components/svgs/icons';

interface ITimerStatus {
	status: 'running' | 'online' | 'idle' | 'suspended' | 'pause';
}
const TimerStatus: FC<ITimerStatus> = ({ status }) => {
	let iconSvgXml = '';

	switch (status) {
		case 'online':
			iconSvgXml = onlineAndTrackingTimeStatusIcon;
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
			style={[
				styles.statusIcon,
				{
					padding: 3,
					borderRadius: 100,
					borderWidth: 2,
					borderColor: 'white',
					backgroundColor:
						status === 'online'
							? '#6EE7B7'
							: status === 'pause'
							? '#EFCF9E'
							: status === 'idle'
							? '#F5BEBE'
							: '#DCD6D6'
				}
			]}
		>
			<SvgXml xml={iconSvgXml} />
		</View>
	);
};

const UserHeaderCard = ({ member, user }: { member: OT_Member; user: IUser }) => {
	const { colors } = useAppTheme();
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
			<TimerStatus status={getTimerStatusValue(timerStatus, currentMember, currentTeam?.public)} />
			<Text style={[styles.name, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
				{user?.name}
			</Text>
		</View>
	);
};

export default UserHeaderCard;

const styles = StyleSheet.create({
	name: {
		color: '#1B005D',
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		left: 15,
		maxWidth: '70%'
	},
	prefix: {
		color: '#FFFFFF',
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 26,
		fontWeight: '200'
	},
	statusIcon: {
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
