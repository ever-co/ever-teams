/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOrganizationTeamList } from '../../services/interfaces/IOrganizationTeam';
import { SettingScreenNavigationProp } from '../../navigators/authenticated-navigator';

// STYLES
import { GLOBAL_STYLE as GS } from '../../../assets/ts/styles';
import { typography, useAppTheme } from '../../theme';
import { imgTitle } from '../../helpers/img-title';
import { useStores } from '../../models';
import { translate } from '../../i18n';
import { Avatar } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { limitTextCharaters } from '../../helpers/sub-text';
import { useNavigation } from '@react-navigation/native';
// import { FlatList } from 'react-native-gesture-handler';

export interface Props {
	teams: IOrganizationTeamList[];
	changeTeam: (value: IOrganizationTeamList) => any;
	onCreateTeam: () => unknown;
	resized: boolean;
	isAccountVerified: boolean;
	isDrawer?: boolean;
}

const DropDownSection: FC<Props> = observer(function DropDownSection({
	teams,
	onCreateTeam,
	changeTeam,
	resized,
	isAccountVerified
	// isDrawer
}) {
	const {
		teamStore: { activeTeamId, activeTeam }
	} = useStores();

	const others = teams.filter((t) => t.id !== activeTeamId);

	const { colors, dark } = useAppTheme();
	return (
		<View
			style={[
				styles.mainContainer,
				{
					backgroundColor: colors.background,
					shadowColor: 'rgba(0, 0, 0, 0.12)',
					borderWidth: dark ? 1 : 0,
					borderColor: colors.border
				}
			]}
		>
			{/* <View style={styles.indDropDown}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Avatar.Text
						style={styles.teamImage}
						size={30}
						label={imgTitle("ALL")}
						labelStyle={styles.prefix}
					/>
					<Text
						style={{
							color: colors.tertiary,
							paddingLeft: "5%",
							fontSize: 16,
							fontFamily: typography.primary.normal,
						}}
					>
						{"ALL"}
					</Text>
				</View>
				<TouchableOpacity>
					<Ionicons name="settings-outline" size={24} color={colors.primary} />
				</TouchableOpacity>
			</View> */}

			{activeTeamId && (
				<DropItem resized={resized} team={activeTeam} changeTeam={changeTeam} isActiveTeam={true} />
			)}

			{others.map((item, index) => (
				<DropItem key={index} team={item} resized={resized} changeTeam={changeTeam} isActiveTeam={false} />
			))}

			{/* <FlatList
				data={others}
				scrollEnabled={false}
				renderItem={({ item, index }) => (
					<View
						style={{
							width: resized ? '100%' : '90%',
							justifyContent: 'center',
							alignItems: 'center',
							paddingRight: isDrawer && 3.5
						}}
					>
						<DropItem
							key={index}
							team={item}
							resized={resized}
							changeTeam={changeTeam}
							isActiveTeam={false}
						/>
					</View>
				)}
			/> */}
			<TouchableOpacity
				style={{ width: '90%', opacity: isAccountVerified ? 1 : 0.5 }}
				onPress={() => onCreateTeam()}
				disabled={!isAccountVerified}
			>
				<View
					style={[styles.buttonStyle, { backgroundColor: colors.background, borderColor: colors.secondary }]}
				>
					<Ionicons name="add" size={24} color={colors.secondary} />
					<Text
						style={{
							color: colors.secondary,
							fontSize: 14,
							fontFamily: typography.primary.semiBold
						}}
					>
						{translate('teamScreen.createNewTeamButton')}
					</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
});

export interface IDropItem {
	team: IOrganizationTeamList;
	isActiveTeam: boolean;
	changeTeam: (value: IOrganizationTeamList) => any;
	resized: boolean;
}

const DropItem: FC<IDropItem> = observer(function DropItem({ team, changeTeam, isActiveTeam, resized }) {
	const { colors } = useAppTheme();

	const navigation = useNavigation<SettingScreenNavigationProp<'Setting'>>();

	const navigateToSettings = (team: IOrganizationTeamList) => {
		if (isActiveTeam) {
			navigation.navigate('Setting', { activeTab: 2 });
		} else {
			changeTeam(team);
			navigation.navigate('Setting', { activeTab: 2 });
		}
	};
	return (
		<View style={styles.indDropDown}>
			<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => changeTeam(team)}>
				{team?.image?.thumbUrl || team?.logo || team?.image?.fullUrl ? (
					<Avatar.Image
						style={styles.teamImage}
						size={30}
						source={{ uri: team?.image?.thumbUrl || team?.logo || team.image?.fullUrl }}
					/>
				) : (
					<Avatar.Text
						style={styles.teamImage}
						size={30}
						label={imgTitle(team.name)}
						labelStyle={styles.prefix}
					/>
				)}
				<Text
					style={{
						color: colors.primary,
						paddingLeft: '5%',
						fontSize: 14,
						fontFamily: isActiveTeam ? typography.primary.semiBold : typography.primary.normal
					}}
				>
					{limitTextCharaters({
						text: team?.name,
						numChars: resized ? (Platform.OS === 'android' ? 10 : 12) : Platform.OS === 'android' ? 17 : 20
					})}{' '}
					({team?.members.length})
				</Text>
			</TouchableOpacity>
			<TouchableOpacity onPress={() => navigateToSettings(team)}>
				<Ionicons name="settings-outline" size={20} color={colors.primary} />
			</TouchableOpacity>
		</View>
	);
});

const styles = StyleSheet.create({
	buttonStyle: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderColor: '#3826A6',
		borderRadius: 10,
		borderWidth: 1.5,
		flexDirection: 'row',
		height: 44,
		justifyContent: 'center',
		marginBottom: 10,
		marginTop: 10,
		paddingBottom: 5,
		paddingTop: 5,
		width: '100%'
	},
	indDropDown: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 10,
		width: '90%'
	},
	mainContainer: {
		alignItems: 'center',
		borderRadius: 10,
		elevation: 100,
		justifyContent: 'center',
		left: 0,
		minWidth: 240,
		paddingTop: 10,
		position: 'absolute',
		top: 58,
		width: '100%',
		zIndex: 10,
		...GS.shadow,
		shadowOffset: { width: 0, height: 10 }
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: '600'
	},
	teamImage: {
		backgroundColor: '#C1E0EA',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1.5
		}
	}
});

export default DropDownSection;
