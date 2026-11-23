/* eslint-disable react-native/no-inline-styles */
import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Avatar } from 'react-native-paper';
import { ChevronsUpDown } from '../../../src/components/icons';
import { imgTitle } from '../../helpers/img-title';
import { useStores } from '../../models';
import { IOrganizationTeamList } from '../../services/interfaces/IOrganizationTeam';
import { useWebTheme } from '../../theme';
import DropDownSection from './drop-down-section';
import { limitTextCharaters } from '../../helpers/sub-text';

export interface Props {
	onCreateTeam: () => unknown;
	resized: boolean;
	isOpen: boolean;
	setIsOpen: (value: boolean) => unknown;
	isAccountVerified: boolean;
	isDrawer?: boolean;
}

/** How many characters of the team's name fit: fewer when the switcher shares its row with Invite. */
function nameLengthOf(resized: boolean) {
	if (!resized) {
		return 26;
	}
	if (Platform.OS === 'android') {
		return 9;
	}
	return 10;
}

/** The team switcher: the web's 44-tall control, its list of teams opening under it. */
const DropDown: FC<Props> = observer(function CreateTeamModal({
	onCreateTeam,
	resized,
	setIsOpen,
	isOpen,
	isAccountVerified,
	isDrawer
}) {
	const { colors } = useWebTheme();
	const {
		teamStore: { teams, setActiveTeam, activeTeam },
		TaskStore: { setActiveTask, setActiveTaskId }
	} = useStores();
	const teamImageUri = activeTeam?.image?.thumbUrl || activeTeam?.logo || activeTeam?.image?.fullUrl;
	const teamName = limitTextCharaters({ text: activeTeam?.name, numChars: nameLengthOf(resized) });

	const changeActiveTeam = (newActiveTeam: IOrganizationTeamList) => {
		setActiveTeam(newActiveTeam);
		setActiveTask(null);
		setActiveTaskId('');
		setIsOpen(false);
	};

	return (
		<View style={styles.mainContainer}>
			<TouchableOpacity
				testID="team-switcher"
				accessibilityRole="button"
				accessibilityState={{ expanded: isOpen }}
				style={[styles.mainDropDown, { backgroundColor: colors.card, borderColor: colors.input }]}
				activeOpacity={0.7}
				onPress={() => setIsOpen(!isOpen)}
			>
				<View style={styles.teamRow}>
					{teamImageUri ? (
						<Avatar.Image size={28} source={{ uri: teamImageUri }} />
					) : (
						<Avatar.Text
							style={{ backgroundColor: colors.muted }}
							size={28}
							color={colors.foreground}
							label={imgTitle(activeTeam?.name)}
							labelStyle={styles.prefix}
						/>
					)}

					<Text numberOfLines={1} style={[styles.activeTeamTxt, { color: colors.foreground }]}>
						{teamName}{' '}
						<Text style={{ color: colors['muted-foreground'] }}>({activeTeam?.members.length})</Text>
					</Text>
				</View>

				<ChevronsUpDown size={14} color={colors['muted-foreground']} />
			</TouchableOpacity>

			{isOpen && (
				<DropDownSection
					resized={resized}
					changeTeam={changeActiveTeam}
					teams={teams.items}
					onCreateTeam={onCreateTeam}
					isAccountVerified={isAccountVerified}
					isDrawer={isDrawer}
				/>
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	// one line that ends with an ellipsis within the switcher, before the chevron, whatever the name's length
	activeTeamTxt: {
		flexShrink: 1,
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 10
	},
	mainContainer: {
		alignItems: 'center',
		flexDirection: 'column',
		justifyContent: 'center',
		width: '100%',
		zIndex: 999
	},
	mainDropDown: {
		alignItems: 'center',
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
		flexDirection: 'row',
		height: 44,
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		width: '100%'
	},
	prefix: {
		fontSize: 12,
		fontWeight: '600'
	},
	teamRow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexShrink: 1
	}
});

export default DropDown;
