/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { typography, useAppTheme, useWebTheme } from '../../../../theme';

// COMPONENTS
import { Text } from '../../../../components';
import { IUser } from '../../../../services/interfaces/IUserData';
import ProfileImage from '../../../../components/profile-image';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../../../models';
import { Avatar } from 'react-native-paper';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { imgTitle } from '../../../../helpers/img-title';

const ProfileHeader = observer((member: IUser) => {
	const { colors } = useAppTheme();
	return (
		<View testID="profile-header" style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.identity}>
				<ProfileImage user={member} size={48} />
				{/* the team sits under the e-mail: beside it, a long e-mail ran into it on a small phone */}
				<View testID="profile-identity" style={styles.containerInfo}>
					<Text numberOfLines={1} style={[styles.name, { color: colors.primary }]}>
						{member?.name}
					</Text>
					<Text numberOfLines={1} style={[styles.email, { color: colors.tertiary }]}>
						{member?.email}
					</Text>
					<UserTeam />
				</View>
			</View>
		</View>
	);
});

const UserTeam = observer(() => {
	const {
		teamStore: { activeTeam }
	} = useStores();
	const { colors } = useWebTheme();

	return (
		<View testID="profile-team" style={[styles.activeTeamContainer, { backgroundColor: colors.muted }]}>
			{activeTeam?.image?.thumbUrl || activeTeam?.logo || activeTeam?.image?.fullUrl ? (
				<Avatar.Image
					style={styles.teamImage}
					size={16}
					source={{
						uri: activeTeam?.image?.thumbUrl || activeTeam?.logo || activeTeam?.image?.fullUrl
					}}
				/>
			) : (
				<Avatar.Text
					style={styles.teamImage}
					size={16}
					label={imgTitle(activeTeam?.name)}
					labelStyle={styles.prefix}
				/>
			)}

			<Text style={[styles.activeTeamTxt, { color: colors['muted-foreground'] }]}>{`${limitTextCharaters({
				text: activeTeam?.name,
				numChars: 16
			})} `}</Text>
		</View>
	);
});

const styles = StyleSheet.create({
	activeTeamContainer: {
		alignItems: 'center',
		borderRadius: 60,
		flexDirection: 'row',
		gap: 3,
		paddingHorizontal: 4,
		paddingVertical: 0
	},
	activeTeamTxt: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 11,
		fontWeight: '600'

		// left: 12,
	},
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 24,
		paddingHorizontal: 20,
		paddingTop: 14
	},
	containerInfo: {
		alignItems: 'flex-start',
		flexShrink: 1,
		gap: 2,
		justifyContent: 'center',
		marginLeft: 10
	},
	// The web's identity band: the name 20/600, the e-mail 13 muted
	identity: {
		flex: 1,
		flexDirection: 'row'
	},
	email: {
		fontFamily: typography.secondary.medium,
		fontSize: 13
	},
	name: {
		fontFamily: typography.primary.semiBold,
		fontSize: 20,
		fontWeight: '600'
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 8,
		fontWeight: '600'
	},
	teamImage: {
		backgroundColor: '#C1E0EA'
	}
});

export default ProfileHeader;
