/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOrganizationTeamList } from '../../services/interfaces/IOrganizationTeam';
import { SettingScreenNavigationProp } from '../../navigators/authenticated-navigator';

import { useWebTheme } from '../../theme';
import { imgTitle } from '../../helpers/img-title';
import { useStores } from '../../models';
import { translate } from '../../i18n';
import { Avatar } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { limitTextCharaters } from '../../helpers/sub-text';
import { useNavigation } from '@react-navigation/native';
import { navigateTo } from '../../navigators/routes';
// import { FlatList } from 'react-native-gesture-handler';

const CREATE_BUTTON_SLOP = { top: 4, bottom: 4 };

/** How many characters of a team's name fit in the list: fewer when the switcher shares its row with Invite. */
function rowNameLengthOf(resized: boolean) {
	const android = Platform.OS === 'android';
	if (resized && android) {
		return 10;
	}
	if (resized) {
		return 12;
	}
	if (android) {
		return 17;
	}
	return 20;
}

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

	const { colors } = useWebTheme();
	return (
		<View
			testID="team-switcher-list"
			style={[styles.mainContainer, { backgroundColor: colors.popover, borderColor: colors.border }]}
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
				testID="team-switcher-create"
				accessibilityRole="button"
				accessibilityState={{ disabled: !isAccountVerified }}
				// The 36-tall pill reaches the smallest touch target through its margin
				hitSlop={CREATE_BUTTON_SLOP}
				style={[styles.createButton, { borderColor: colors.input }, !isAccountVerified && { opacity: 0.5 }]}
				onPress={() => onCreateTeam()}
				disabled={!isAccountVerified}
			>
				<Ionicons name="add" size={18} color={colors['primary-ink']} />
				<Text style={[styles.createText, { color: colors['primary-ink'] }]}>
					{translate('teamScreen.createNewTeamButton')}
				</Text>
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
	const { colors } = useWebTheme();
	const teamImageUri = team?.image?.thumbUrl || team?.logo || team?.image?.fullUrl;

	const navigation = useNavigation<SettingScreenNavigationProp<'Setting'>>();

	const navigateToSettings = (team: IOrganizationTeamList) => {
		if (isActiveTeam) {
			navigateTo(navigation, 'Setting', { activeTab: 2 });
		} else {
			changeTeam(team);
			navigateTo(navigation, 'Setting', { activeTab: 2 });
		}
	};
	return (
		<View style={[styles.indDropDown, isActiveTeam && { backgroundColor: colors.accent }]}>
			<TouchableOpacity
				testID="team-switcher-team"
				accessibilityRole="button"
				accessibilityState={{ selected: isActiveTeam }}
				style={styles.teamRow}
				onPress={() => changeTeam(team)}
			>
				{teamImageUri ? (
					<Avatar.Image size={24} source={{ uri: teamImageUri }} />
				) : (
					<Avatar.Text
						style={{ backgroundColor: colors.muted }}
						size={24}
						color={colors.foreground}
						label={imgTitle(team.name)}
						labelStyle={styles.prefix}
					/>
				)}
				<Text style={[styles.teamName, { color: colors.foreground }, isActiveTeam && styles.activeTeamName]}>
					{limitTextCharaters({ text: team?.name, numChars: rowNameLengthOf(resized) })}{' '}
					<Text style={{ color: colors['muted-foreground'] }}>({team?.members.length})</Text>
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				testID="team-switcher-settings"
				accessibilityRole="button"
				accessibilityLabel={translate('settingScreen.name')}
				accessibilityHint={team?.name}
				style={styles.settingsButton}
				onPress={() => navigateToSettings(team)}
			>
				<Ionicons name="settings-outline" size={18} color={colors['muted-foreground']} />
			</TouchableOpacity>
		</View>
	);
});

const styles = StyleSheet.create({
	activeTeamName: {
		fontWeight: '500'
	},
	createButton: {
		alignItems: 'center',
		alignSelf: 'stretch',
		borderRadius: 999,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 6,
		height: 36,
		justifyContent: 'center',
		margin: 4
	},
	createText: {
		fontSize: 14,
		fontWeight: '500'
	},
	indDropDown: {
		alignItems: 'center',
		alignSelf: 'stretch',
		borderRadius: 6,
		flexDirection: 'row',
		height: 44,
		justifyContent: 'space-between',
		paddingHorizontal: 8
	},
	// The web's floating panel: radius 10, a hairline and the shadow of a layer over the page
	mainContainer: {
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 12px 32px -4px rgba(0, 0, 0, 0.1)',
		left: 0,
		minWidth: 240,
		padding: 4,
		position: 'absolute',
		top: 48,
		width: '100%',
		zIndex: 10
	},
	prefix: {
		fontSize: 11,
		fontWeight: '600'
	},
	// A square of the smallest touch target at the row's end, over its padding
	settingsButton: {
		alignItems: 'center',
		alignSelf: 'stretch',
		justifyContent: 'center',
		marginRight: -8,
		width: 44
	},
	teamName: {
		fontSize: 14,
		marginLeft: 10
	},
	// The whole row up to the settings button chooses the team, at the row's full height
	teamRow: {
		alignItems: 'center',
		alignSelf: 'stretch',
		flex: 1,
		flexDirection: 'row'
	}
});

export default DropDownSection;
