/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from "react"
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	Dimensions,
	TouchableWithoutFeedback,
} from "react-native"
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons"
import { Text } from "react-native-paper"
import { DrawerContentScrollView, useDrawerStatus } from "@react-navigation/drawer"
import { typography, useAppTheme } from "../theme"
import { useStores } from "../models"
import DropDown from "./TeamDropdown/DropDown"
import CreateTeamModal from "./CreateTeamModal"
import ProfileImage from "./ProfileImage"
import { translate } from "../i18n"
import { observer } from "mobx-react-lite"
import { useOrganizationTeam } from "../services/hooks/useOrganization"
import { SvgXml } from "react-native-svg"
import { moonDarkLarge, moonLightLarge, sunDarkLarge, sunLightLarge } from "./svgs/icons"

const HamburgerMenu = observer((props: any) => {
	const { colors, dark } = useAppTheme()
	const {
		TaskStore: { resetTeamTasksData },
		authenticationStore: { user, logout, toggleTheme },
		teamStore: { clearStoredTeamData },
	} = useStores()
	const { createOrganizationTeam, activeTeam } = useOrganizationTeam()
	const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
	const [isTeamModalOpen, setIsTeamModalOpen] = React.useState<boolean>(false)

	const { navigation } = props
	const isOpen = useDrawerStatus() === "open"

	const onLogout = () => {
		resetTeamTasksData()
		clearStoredTeamData()
		logout()
	}

	useEffect(() => {
		setIsTeamModalOpen(false)
	}, [isOpen])

	return (
		<TouchableWithoutFeedback onPress={() => setIsTeamModalOpen(false)}>
			<View
				style={[
					styles.container,
					{ backgroundColor: dark ? colors.background2 : colors.background },
				]}
			>
				<CreateTeamModal
					onCreateTeam={createOrganizationTeam}
					visible={showCreateTeamModal}
					onDismiss={() => setShowCreateTeamModal(false)}
				/>
				<DrawerContentScrollView style={{ width: "100%" }} {...props}>
					<View style={styles.profileSection}>
						<View style={{ marginBottom: 40 }}>
							<ProfileImage size={76} user={user} />
						</View>
						<Text style={[styles.userProfileName, { color: colors.primary, marginTop: 30 }]}>
							{user?.name}
						</Text>
						<Text
							style={{
								color: colors.tertiary,
								fontSize: 14,
								marginBottom: 20,
								fontFamily: typography.secondary.medium,
								marginTop: 4,
							}}
						>
							{user?.email}
						</Text>
						{activeTeam ? (
							<DropDown
								isOpen={isTeamModalOpen}
								setIsOpen={setIsTeamModalOpen}
								resized={true}
								onCreateTeam={() => setShowCreateTeamModal(true)}
								isAccountVerified={user.isEmailVerified}
							/>
						) : null}
					</View>
					<View style={styles.navigationSection}>
						{activeTeam ? (
							<TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Timer")}>
								<Ionicons style={styles.icon} name="person" size={24} color={colors.primary} />
								<Text style={[styles.screenLabel, { color: colors.primary }]}>
									{translate("myWorkScreen.name")}
								</Text>
							</TouchableOpacity>
						) : null}

						<TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Team")}>
							<FontAwesome5 style={styles.icon} name="users" size={24} color={colors.primary} />
							<Text style={[styles.screenLabel, { color: colors.primary }]}>
								{translate("teamScreen.name")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.item}
							onPress={() => navigation.navigate("Profile", { userId: user?.id, tabIndex: 0 })}
						>
							<Ionicons
								style={styles.icon}
								name="ios-briefcase-outline"
								size={24}
								color={colors.primary}
							/>
							<Text style={[styles.screenLabel, { color: colors.primary }]}>
								{translate("tasksScreen.name")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Setting")}>
							<Feather style={styles.icon} name="settings" size={24} color={colors.primary} />
							<Text style={[styles.screenLabel, { color: colors.primary }]}>
								{translate("settingScreen.name")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.screenItem}>
							<View style={{ flexDirection: "row" }}>
								<Ionicons
									style={styles.icon}
									name="moon-outline"
									size={24}
									color={colors.primary}
								/>
								<Text style={[styles.screenLabel, { color: colors.primary }]}>
									{translate("hamburgerMenu.darkMode")}
								</Text>
							</View>
							<TouchableOpacity
								onPress={toggleTheme}
								style={[
									styles.toggle,
									dark ? { backgroundColor: "#1D222A" } : { backgroundColor: "#E7E7EA" },
								]}
							>
								{dark ? (
									<View style={styles.iconsContainer}>
										<SvgXml xml={sunDarkLarge} />
										<SvgXml xml={moonDarkLarge} />
									</View>
								) : (
									<View style={styles.iconsContainer}>
										<View style={[styles.iconWrapper, { backgroundColor: "white" }]}>
											<SvgXml xml={sunLightLarge} />
										</View>
										<View style={[styles.iconWrapper, { backgroundColor: "transparent" }]}>
											<SvgXml xml={moonLightLarge} />
										</View>
									</View>
								)}
							</TouchableOpacity>
						</TouchableOpacity>
					</View>
				</DrawerContentScrollView>

				<View style={styles.bottomSection}>
					<TouchableOpacity
						style={{ flexDirection: "row", justifyContent: "space-between" }}
						onPress={() => onLogout()}
					>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Image source={require("../../assets/icons/new/logout.png")} />
							<Text
								style={{
									marginLeft: 10,
									color: "#DE437B",
									fontFamily: typography.primary.semiBold,
									fontSize: 16,
								}}
							>
								{translate("common.logOut")}
							</Text>
						</View>
					</TouchableOpacity>
				</View>
				{isOpen ? (
					<TouchableOpacity
						style={[styles.close, { backgroundColor: colors.background }]}
						onPress={() => navigation.closeDrawer()}
					>
						<Text style={{ color: colors.primary }}>X</Text>
					</TouchableOpacity>
				) : null}
			</View>
		</TouchableWithoutFeedback>
	)
})

const { width } = Dimensions.get("window")
const styles = StyleSheet.create({
	bottomSection: {
		borderTopColor: "rgba(0, 0, 0, 0.16)",
		borderTopWidth: 1,
		marginBottom: 37,
		paddingTop: 37,
	},
	close: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		height: 40,
		justifyContent: "center",
		left: -(width / 4),
		position: "absolute",
		top: 66,
		width: 40,
		zIndex: 1000,
	},
	container: {
		flex: 1,
		paddingHorizontal: 20,
	},
	headerIconsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	icon: { width: 30 },
	iconWrapper: { borderRadius: 60, padding: 7 },
	iconsContainer: {
		alignItems: "center",
		backgroundColor: "transparent",
		display: "flex",
		flexDirection: "row",
		height: "100%",
		justifyContent: "space-between",
		paddingLeft: 4,
		paddingRight: 4,
		width: "100%",
	},
	item: {
		alignItems: "center",
		flexDirection: "row",
		marginBottom: 30,
	},
	navigationSection: {
		marginTop: 20,
		padding: 0,
		zIndex: 1,
	},
	profileImage: {
		alignSelf: "center",
		borderRadius: 60,
		height: 120,
		top: 2,
		width: 120,
	},
	profileImageContainer: {
		alignItems: "center",
		borderRadius: 60,
		height: 84,
		justifyContent: "center",
		width: 84,
	},
	profileSection: {
		alignItems: "center",
		borderBottomColor: "rgba(0, 0, 0, 0.16)",
		borderBottomWidth: 1,
		justifyContent: "center",
		marginHorizontal: "1%",
		paddingBottom: 10,
		zIndex: 10,
	},

	screenItem: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
	screenLabel: {
		fontFamily: typography.secondary.medium,
		fontSize: 16,
		left: 15,
	},
	toggle: {
		borderRadius: 60,
		height: 40,
		width: 86,
	},
	userProfileName: {
		fontFamily: typography.primary.semiBold,
		fontSize: 20,
		marginTop: 15,
	},
})

export default HamburgerMenu
