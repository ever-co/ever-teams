/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from "react"
import {
	View,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	TouchableWithoutFeedback,
} from "react-native"
import { Avatar, Text } from "react-native-paper"
import { Ionicons, Entypo } from "@expo/vector-icons"

// COMPONENTS
import { Card, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { observer } from "mobx-react-lite"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { translate } from "../../../../i18n"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { imgTitle } from "../../../../helpers/img-title"
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"

export type ListItemProps = {
	invite: any
	onPressIn?: () => unknown
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = observer(({ invite, onPressIn }) => {
	// HOOKS
	const { colors } = useAppTheme()

	return (
		<TouchableWithoutFeedback onPress={() => onPressIn()}>
			<View
				style={{
					...GS.p3,
					...GS.positionRelative,
					backgroundColor: colors.background,
					borderRadius: 10,
				}}
			>
				<View style={styles.firstContainer}>
					<View style={styles.wrapProfileImg}>
						<Avatar.Text style={{ opacity: 0.2 }} size={40} label={imgTitle(invite.fullName)} />
						<Avatar.Image
							style={styles.statusIcon}
							size={20}
							source={require("../../../../../assets/icons/new/invite-status-icon.png")}
						/>
					</View>
					<Text style={[styles.name, { color: colors.primary }]}>{invite.fullName}</Text>
					{/* ENABLE ESTIMATE INPUTS */}
					<View style={styles.wrapTotalTime}>
						<View style={{ ...GS.alignCenter, height: "80%", justifyContent: "space-between" }}>
							<Text style={styles.totalTimeTitle}>
								{translate("teamScreen.cardTotalTimeLabel")}
							</Text>
							<Text style={[styles.totalTimeText, { color: colors.primary, fontSize: 14 }]}>
								20 h:30 m
							</Text>
						</View>
					</View>
				</View>
				<View style={[styles.wrapTaskTitle, { borderTopColor: colors.divider }]}>
					<Text style={[styles.otherText, { color: colors.primary }]}>
						{/* {memberTask ? memberTask.title : ""} */}
						Working on UI Design & making prototype for user testing tomorrow
					</Text>
				</View>
				<View style={[styles.times, { borderTopColor: colors.divider }]}>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							height: 48,
							width: "100%",
						}}
					>
						<View style={{ ...GS.alignCenter, height: "80%", justifyContent: "space-between" }}>
							<Text style={styles.totalTimeTitle}>
								{translate("teamScreen.cardTodayWorkLabel")}
							</Text>
							<Text style={[styles.totalTimeText, { color: colors.primary, fontSize: 14 }]}>
								20 h:30 m
							</Text>
						</View>
						<View style={{ ...GS.alignCenter }}>
							<View style={{ ...GS.alignCenter, height: "80%", justifyContent: "space-between" }}>
								<Text style={styles.totalTimeTitle}>
									{translate("teamScreen.cardTotalWorkLabel")}
								</Text>
								<Text style={[styles.totalTimeText, { color: colors.primary, fontSize: 14 }]}>
									20 h:30 m
								</Text>
							</View>
						</View>
						<View style={{}}>
							<AnimatedCircularProgress
								size={48}
								width={5}
								fill={0}
								tintColor="#27AE60"
								backgroundColor="#F0F0F0"
							>
								{() => <Text style={{ ...styles.progessText, color: colors.primary }}>0 H</Text>}
							</AnimatedCircularProgress>
						</View>
					</View>
				</View>
			</View>
		</TouchableWithoutFeedback>
	)
})

const ListCardItem: React.FC<Props> = (props) => {
	const { colors } = useAppTheme()
	const { isTeamManager } = useOrganizationTeam()
	const { resendInvite, removeSentInvitation } = useTeamInvitations()
	// STATS
	const [showMenu, setShowMenu] = React.useState(false)
	const [showConfirm, setShowConfirm] = React.useState(false)
	const [showCard, setShowCard] = React.useState(true)

	const { invite } = props

	const handleRemoveInvitation = (inviteId: string) => {
		removeSentInvitation(inviteId)
		setShowConfirm(false)
		setShowMenu(false)
		setShowCard(false)
	}

	return (
		<Card
			style={{
				...$listCard,
				...GS.mt5,
				paddingTop: 4,
				backgroundColor: "#DCD6D6",
				display: showCard ? "flex" : "none",
			}}
			HeadingComponent={
				<View
					style={{
						...GS.positionAbsolute,
						...GS.t0,
						...GS.r0,
						...GS.pt5,
						...GS.pr3,
						...GS.zIndexFront,
						...(!isTeamManager ? { display: "none" } : {}),
					}}
				>
					<View
						style={{
							...GS.positionRelative,
							...GS.zIndexFront,
						}}
					>
						<View
							style={{
								...GS.positionAbsolute,
								...GS.p2,
								...GS.pt1,
								...GS.shadow,
								...GS.r0,
								...GS.roundedSm,
								...GS.zIndexFront,
								opacity: 1,
								width: 172,
								marginTop: -spacing.extraSmall,
								marginRight: 17,
								backgroundColor: colors.background,
								minWidth: spacing.huge * 2,
								...(!showMenu ? { display: "none" } : {}),
							}}
						>
							<View style={{}}>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => {
										resendInvite(invite.id)
										setShowMenu(!showMenu)
									}}
								>
									{translate("tasksScreen.resendInvitation")}
								</ListItem>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: "#ef4444" }]}
									onPress={() => {
										setShowConfirm(!showConfirm)
									}}
								>
									{translate("tasksScreen.remove")}
								</ListItem>
							</View>
						</View>

						<TouchableOpacity
							onPress={() => {
								setShowMenu(!showMenu)
								setShowConfirm(false)
							}}
						>
							{!showMenu ? (
								<Ionicons name="ellipsis-vertical-outline" size={24} color={colors.primary} />
							) : (
								<Entypo name="cross" size={24} color={colors.primary} />
							)}
						</TouchableOpacity>
					</View>
				</View>
			}
			ContentComponent={
				<>
					<ListItemContent {...props} onPressIn={() => setShowMenu(!showMenu)} />
					{showConfirm && (
						<View style={[styles.confirmContainer, { backgroundColor: colors.background }]}>
							<TouchableOpacity onPress={() => handleRemoveInvitation(invite.id)}>
								<Text style={[styles.confirmText, { color: colors.secondary }]}>Confirm</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setShowConfirm(false)}>
								<Text>Cancel</Text>
							</TouchableOpacity>
						</View>
					)}
				</>
			}
		/>
	)
}

export default ListCardItem

const $listCard: ViewStyle = {
	...GS.flex1,
	...GS.p0,
	...GS.noBorder,
	...GS.shadowSm,
	minHeight: null,
	borderRadius: 14,
}

const styles = StyleSheet.create({
	confirmContainer: {
		borderRadius: 5,
		elevation: 5,
		padding: 10,
		position: "absolute",
		right: 207,
		shadowColor: "#2979FF",
		shadowOffset: { width: 1, height: 1.5 },
		shadowOpacity: 0.5,
		shadowRadius: 5,
		top: 60,
	},
	confirmText: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 5,
	},
	dropdownTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},

	firstContainer: {
		alignItems: "center",
		flexDirection: "row",
	},
	name: {
		color: "#1B005D",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		left: 15,
		opacity: 0.2,
	},
	otherText: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontStyle: "normal",
		lineHeight: 15,
		opacity: 0.2,
		width: "100%",
	},
	progessText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
		opacity: 0.2,
	},
	statusIcon: {
		bottom: 0,
		position: "absolute",
		right: -4,
	},
	times: {
		alignItems: "center",
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingTop: 16,
	},
	totalTimeText: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		opacity: 0.2,
	},
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 10,
		fontWeight: "500",
		marginBottom: 9,
		opacity: 0.2,
	},
	wrapProfileImg: {
		flexDirection: "row",
	},
	wrapTaskTitle: {
		borderTopWidth: 1,
		marginTop: 16,
		paddingVertical: 16,
		width: "100%",
	},
	wrapTotalTime: {
		alignItems: "center",
		justifyContent: "center",
		marginRight: 30,
		position: "absolute",
		right: 0,
	},
})
