/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Text } from 'react-native-paper';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { typography, useAppTheme, useWebTheme } from '../theme';
import { useStores } from '../models';
import DropDown from './team-dropdown/drop-down';
import CreateTeamModal from './create-team-modal';
import ProfileImage from './profile-image';
import { translate } from '../i18n';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../services/hooks/use-organization';
import { BlurView } from 'expo-blur';
import { navigateTo } from '../navigators/routes';
import { usePathname } from 'expo-router';
import { MenuRow } from './menu-row';
import { menuEntryOf } from './menu-current';
import { ThemeChoice } from './theme-choice';

const HamburgerMenu = observer((props: any) => {
	const { colors, dark } = useAppTheme();
	const theme = useWebTheme();
	const {
		TaskStore: { resetTeamTasksData },
		authenticationStore: { user, logout },
		teamStore: { clearStoredTeamData }
	} = useStores();
	const { createOrganizationTeam, activeTeam } = useOrganizationTeam();
	const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false);
	const [isTeamModalOpen, setIsTeamModalOpen] = React.useState<boolean>(false);
	const [containerWidth, setContainerWidth] = React.useState(0);

	const { navigation } = props;
	const isOpen = useDrawerStatus() === 'open';
	const currentEntry = menuEntryOf(usePathname());

	const onLogout = () => {
		resetTeamTasksData();
		clearStoredTeamData();
		logout();
	};

	useEffect(() => {
		setIsTeamModalOpen(false);
	}, [isOpen]);

	return (
		<TouchableWithoutFeedback
			onLayout={(event) => {
				const { width } = event.nativeEvent.layout;
				setContainerWidth(width);
			}}
			onPress={() => setIsTeamModalOpen(false)}
		>
			<View style={[styles.container, { backgroundColor: dark ? colors.background2 : colors.background }]}>
				<CreateTeamModal
					onCreateTeam={createOrganizationTeam}
					visible={showCreateTeamModal}
					onDismiss={() => setShowCreateTeamModal(false)}
				/>
				<DrawerContentScrollView style={{ width: '100%' }} {...props}>
					<View style={[styles.profileSection, { borderBottomColor: theme.colors.border }]}>
						<View testID="menu-person" style={styles.person}>
							<ProfileImage size={40} user={user} />
							<View style={styles.personText}>
								<Text numberOfLines={1} style={[styles.userName, { color: theme.colors.foreground }]}>
									{user?.name}
								</Text>
								<Text
									numberOfLines={1}
									style={[styles.userEmail, { color: theme.colors['muted-foreground'] }]}
								>
									{user?.email}
								</Text>
							</View>
						</View>
						{activeTeam ? (
							<DropDown
								isOpen={isTeamModalOpen}
								setIsOpen={setIsTeamModalOpen}
								resized={true}
								onCreateTeam={() => setShowCreateTeamModal(true)}
								isAccountVerified={user?.isEmailVerified}
								isDrawer={true}
							/>
						) : null}
					</View>
					<View style={styles.navigationSection}>
						{activeTeam ? (
							<MenuRow
								testID="menu-work"
								icon="user"
								label={translate('myWorkScreen.name')}
								isCurrent={currentEntry === 'work'}
								onPress={() => navigateTo(navigation, 'Timer')}
							/>
						) : null}
						<MenuRow
							testID="menu-team"
							icon="users"
							label={translate('teamScreen.name')}
							isCurrent={currentEntry === 'team'}
							onPress={() => navigateTo(navigation, 'Team')}
						/>
						<MenuRow
							testID="menu-tasks"
							icon="briefcase"
							label={translate('tasksScreen.name')}
							isCurrent={currentEntry === 'tasks'}
							onPress={() => navigateTo(navigation, 'Profile', { userId: user?.id, tabIndex: 0 })}
						/>
						<MenuRow
							testID="menu-settings"
							icon="settings"
							label={translate('settingScreen.name')}
							isCurrent={currentEntry === 'settings'}
							onPress={() => navigateTo(navigation, 'Setting')}
						/>
						<View testID="menu-theme" style={styles.themeSection}>
							<Text style={[styles.themeLabel, { color: theme.colors['muted-foreground'] }]}>
								{translate('hamburgerMenu.theme')}
							</Text>
							<ThemeChoice />
						</View>
					</View>
				</DrawerContentScrollView>

				<View style={[styles.bottomSection, { borderTopColor: theme.colors.border }]}>
					<MenuRow
						testID="menu-log-out"
						icon="log-out"
						label={translate('common.logOut')}
						tone="danger"
						onPress={() => onLogout()}
					/>
				</View>
				{isOpen && (
					<BlurView
						intensity={15}
						onTouchStart={() => navigation.closeDrawer()}
						tint="dark"
						style={{
							position: 'absolute',
							width: '100%',
							height: '100%',
							right: containerWidth,
							zIndex: 1000
						}}
					/>
				)}
			</View>
		</TouchableWithoutFeedback>
	);
});

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
	bottomSection: {
		borderTopWidth: StyleSheet.hairlineWidth,
		marginBottom: 24,
		paddingTop: 8
	},
	close: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 20,
		height: 40,
		justifyContent: 'center',
		left: -(width / 4),
		position: 'absolute',
		top: 66,
		width: 40,
		zIndex: 1000
	},
	container: {
		flex: 1,
		paddingHorizontal: 16
	},
	headerIconsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	icon: { width: 30 },
	navigationSection: {
		gap: 2,
		marginTop: 12,
		zIndex: 1
	},
	profileImage: {
		alignSelf: 'center',
		borderRadius: 60,
		height: 120,
		top: 2,
		width: 120
	},
	profileImageContainer: {
		alignItems: 'center',
		borderRadius: 60,
		height: 84,
		justifyContent: 'center',
		width: 84
	},
	person: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12
	},
	personText: {
		flex: 1,
		gap: 2
	},
	profileSection: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 16,
		paddingBottom: 16,
		paddingTop: 8,
		zIndex: 10
	},

	themeLabel: {
		fontFamily: typography.primary.medium,
		fontSize: 13,
		paddingHorizontal: 12
	},
	themeSection: {
		gap: 8,
		marginTop: 16
	},
	userEmail: {
		fontFamily: typography.primary.normal,
		fontSize: 13,
		lineHeight: 17
	},
	userName: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		lineHeight: 18
	}
});

export default HamburgerMenu;
