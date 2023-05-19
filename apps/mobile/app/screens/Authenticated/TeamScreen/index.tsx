/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import {
	ScrollView,
	View,
	TouchableOpacity,
	ViewStyle,
	TouchableWithoutFeedback,
	TextStyle,
	Text,
	Dimensions,
	LogBox,
} from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Screen } from "../../../components"
import InviteUserModal from "./components/InviteUserModal"
import ListCardItem from "./components/ListCardItem"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../theme"
import HomeHeader from "../../../components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import CreateTeamModal from "../../../components/CreateTeamModal"
import { useStores } from "../../../models"
import { observer } from "mobx-react-lite"
import InviteCardItem from "./components/InviteCardItem"
import FlashMessage from "react-native-flash-message"
import { BlurView } from "expo-blur"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import { translate } from "../../../i18n"
import useTeamScreenLogic from "./logics/useTeamScreenLogic"
import TeamScreenSkeleton from "./components/TeamScreenSkeleton"
import AcceptInviteModal from "./components/AcceptInviteModal"
import { useAcceptInviteModal } from "../../../services/hooks/features/useAcceptInviteModal"
import NoTeam from "../../../components/NoTeam"

const { width, height } = Dimensions.get("window")
export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> = observer(
	function AuthenticatedTeamScreen(_props) {
		const { colors, dark } = useAppTheme()
		LogBox.ignoreAllLogs()
		// Get authentificate data
		const {
			teamStore: { teamInvitations, isTeamsExist },
			TimerStore: { localTimerStatus },
		} = useStores()

		const { $otherMembers, createOrganizationTeam, isTeamManager, currentUser } =
			useOrganizationTeam()
		const {
			setShowCreateTeamModal,
			setShowInviteModal,
			showCreateTeamModal,
			showInviteModal,
			setShowMoreMenu,
			isLoading,
		} = useTeamScreenLogic()
		const { openModal, closeModal, activeInvitation, onAcceptInvitation, onRejectInvitation } =
			useAcceptInviteModal()

		return (
			<>
				{showInviteModal && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
				<Screen
					contentContainerStyle={[$container, { backgroundColor: colors.background }]}
					backgroundColor={dark ? "rgb(16,17,20)" : colors.background}
					statusBarStyle={!dark ? "light" : "dark"}
					StatusBarProps={{ backgroundColor: "black" }}
					safeAreaEdges={["top"]}
				>
					{isLoading ? (
						<TeamScreenSkeleton />
					) : (
						<>
							<InviteUserModal
								visible={showInviteModal}
								onDismiss={() => setShowInviteModal(false)}
							/>
							<AcceptInviteModal
								visible={openModal && activeInvitation !== null}
								onDismiss={() => closeModal()}
								invitation={activeInvitation}
								onAcceptInvitation={onAcceptInvitation}
								onRejectInvitation={onRejectInvitation}
							/>
							<CreateTeamModal
								onCreateTeam={createOrganizationTeam}
								visible={showCreateTeamModal}
								onDismiss={() => setShowCreateTeamModal(false)}
							/>
							<HomeHeader props={_props} showTimer={localTimerStatus.running} />
							{isTeamsExist ? (
								<>
									<View
										style={{
											...$wrapTeam,
											backgroundColor: dark ? "#191A20" : "rgba(255,255,255,0.6)",
										}}
									>
										<View style={{ width: isTeamManager ? width / 1.9 : "100%" }}>
											<DropDown
												resized={isTeamManager}
												onCreateTeam={() => setShowCreateTeamModal(true)}
											/>
										</View>
										{isTeamManager ? (
											<TouchableOpacity
												style={[$inviteButton, { borderColor: colors.secondary }]}
												onPress={() => setShowInviteModal(true)}
											>
												<Text style={[$inviteButtonText, { color: colors.secondary }]}>
													{translate("teamScreen.inviteButton")}
												</Text>
											</TouchableOpacity>
										) : null}
									</View>
									<TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
										{/* Users activity list */}
										<ScrollView
											bounces={false}
											showsVerticalScrollIndicator={false}
											contentContainerStyle={{ ...GS.px1 }}
											style={[$cardContainer, { backgroundColor: dark ? "rgb(0,0,0)" : "#F7F7F8" }]}
										>
											<View
												style={{
													marginBottom: 30,
												}}
											>
												{currentUser && <ListCardItem member={currentUser} />}

												{$otherMembers.map((member, index) => (
													<ListCardItem key={index} member={member} />
												))}

												{teamInvitations &&
													teamInvitations.map((invite, idx) => (
														<InviteCardItem key={idx} invite={invite} />
													))}
											</View>
										</ScrollView>
									</TouchableWithoutFeedback>
								</>
							) : (
								<NoTeam onPress={() => setShowCreateTeamModal(true)} />
							)}
							<FlashMessage position="bottom" />
						</>
					)}
				</Screen>
			</>
		)
	},
)

const $container: ViewStyle = {
	...GS.flex1,
}

const $cardContainer: ViewStyle = {
	...GS.flex1,
	paddingHorizontal: spacing.medium,
}
const $blurContainer: ViewStyle = {
	// flex: 1,
	height,
	width: "100%",
	position: "absolute",
	top: 0,
	zIndex: 1001,
}

const $inviteButton: ViewStyle = {
	width: width / 3,
	height: 52,
	paddingHorizontal: 12,
	paddingVertical: 10,
	borderRadius: 10,
	borderWidth: 2,
	justifyContent: "center",
	alignItems: "center",
}
const $inviteButtonText: TextStyle = {
	fontSize: 14,
	fontFamily: typography.fonts.PlusJakartaSans.semiBold,
	color: "#3826A6",
}

const $wrapTeam: ViewStyle = {
	flexDirection: "row",
	width: "100%",
	padding: 20,
	justifyContent: "space-between",
	alignItems: "center",
	zIndex: 999,
}
