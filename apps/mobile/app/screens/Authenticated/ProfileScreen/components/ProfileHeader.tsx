/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { typography, useAppTheme } from '../../../../theme';

// COMPONENTS
import { Text } from '../../../../components';
import { IUser } from '../../../../services/interfaces/IUserData';
import ProfileImage from '../../../../components/ProfileImage';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../../../models';
import { Avatar } from 'react-native-paper';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { imgTitle } from '../../../../helpers/img-title';

const ProfileHeader = observer((member: IUser) => {
	const { colors, dark } = useAppTheme();
	return (
		<View style={[styles.container, { backgroundColor: !dark ? 'rgba(255, 255, 255, 0.5)' : colors.background }]}>
			<View style={{ flexDirection: 'row' }}>
				<ProfileImage user={member} size={70} />
				<View style={styles.containerInfo}>
					<Text style={[styles.name, { color: colors.primary }]}>{member?.name}</Text>
					<Text style={[styles.email, { color: colors.tertiary }]}>{member?.email}</Text>
				</View>
			</View>
			<View
				style={{
					flexDirection: 'column',
					justifyContent: 'flex-end',
					paddingBottom: 10
				}}
			>
				<UserTeam />
			</View>
		</View>
	);
});

const UserTeam = observer(() => {
	const {
		teamStore: { activeTeam }
	} = useStores();

	return (
		<View style={styles.activeTeamContainer}>
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

			<Text style={styles.activeTeamTxt}>{`${limitTextCharaters({
				text: activeTeam?.name,
				numChars: 16
			})} `}</Text>
		</View>
	);
});

const styles = StyleSheet.create({
	activeTeamContainer: {
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 60,
		flexDirection: 'row',
		gap: 3,
		paddingHorizontal: 4,
		paddingVertical: 0
	},
	activeTeamTxt: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 8,
		fontWeight: '600'

		// left: 12,
	},
	container: {
		backgroundColor: '#fff',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 24,
		paddingHorizontal: 20,
		paddingTop: 14
	},
	containerInfo: {
		justifyContent: 'center',
		marginLeft: 10
	},
	email: {
		color: '#7E7991',
		fontFamily: typography.secondary.medium,
		fontSize: 12
	},
	name: {
		color: '#282048',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
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
