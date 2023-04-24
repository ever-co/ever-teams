/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
import React, { useEffect, useRef, useState } from "react"
import {
	View,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	TouchableWithoutFeedback,
} from "react-native"
import { Avatar, Text } from "react-native-paper"
import { Ionicons, Entypo, AntDesign } from "@expo/vector-icons"

// COMPONENTS
import { Card, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { observer } from "mobx-react-lite"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { translate } from "../../../../i18n"
import LabelItem from "../../../../components/LabelItem"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { imgTitle } from "../../../../helpers/img-title"
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"

export type ListItemProps = {
	invite: any
	onPressIn?: () => unknown
}

const labels = [
	{
		id: 1,
		label: "Low",
		color: "#282048",
		background: "#D4EFDF",
		icon: require("../../../../../assets/icons/new/arrow-down.png"),
	},
	{
		id: 2,
		label: "Extra Large",
		color: "#282048",
		background: "#F5B8B8",
		icon: require("../../../../../assets/icons/new/maximize-3.png"),
	},
	{
		id: 3,
		label: "UIUX",
		color: "#9641AB",
		background: "#EAD9EE",
		icon: require("../../../../../assets/icons/new/devices.png"),
	},
	{
		id: 4,
		label: "Low",
		color: "#282048",
		background: "#D4EFDF",
		icon: require("../../../../../assets/icons/new/arrow-down.png"),
	},
]
export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = observer(({ invite, onPressIn }) => {
	// HOOKS
	const { colors, dark } = useAppTheme()

	const flatListRef = useRef<FlatList>(null)
	const [labelIndex, setLabelIndex] = useState(0)

	useEffect(() => {
		flatListRef.current?.scrollToIndex({
			animated: true,
			index: labelIndex,
			viewPosition: 0,
		})
	}, [labelIndex])

	const onNextPressed = () => {
		if (labelIndex !== labels.length - 2) {
			setLabelIndex(labelIndex + 1)
		}
	}

	const onPrevPressed = () => {
		if (labelIndex === 0) {
			return
		}

		setLabelIndex(labelIndex - 1)
	}

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
					<View
						style={{
							marginTop: 16,
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							width: "100%",
						}}
					>
						<FlatList
							data={labels}
							initialScrollIndex={labelIndex}
							renderItem={({ item, index }) => (
								<View key={index} style={{ marginHorizontal: 2, opacity: 0.2 }}>
									<LabelItem
										label={item.label}
										labelColor={item.color}
										background={item.background}
										icon={item.icon}
									/>
								</View>
							)}
							horizontal={true}
							showsHorizontalScrollIndicator={false}
							ref={flatListRef}
							keyExtractor={(_, index) => index.toString()}
							style={{ marginRight: 10, overflow: "scroll" }}
						/>
						{labelIndex === labels.length - 3 ? null : (
							<TouchableOpacity
								activeOpacity={0.7}
								style={[styles.scrollRight, { backgroundColor: colors.background }]}
								onPress={() => onNextPressed()}
							>
								<AntDesign name="right" size={18} color={!dark ? "#938FA4" : colors.primary} />
							</TouchableOpacity>
						)}
						{labelIndex !== 0 ? (
							<TouchableOpacity
								activeOpacity={0.7}
								style={[styles.scrollRight, { left: 0, backgroundColor: colors.background }]}
								onPress={() => onPrevPressed()}
							>
								<AntDesign name="left" size={18} color={!dark ? "#938FA4" : colors.primary} />
							</TouchableOpacity>
						) : null}
					</View>
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
	const { resendInvite } = useTeamInvitations()
	// STATS
	const [showMenu, setShowMenu] = React.useState(false)

	const { invite } = props
	return (
		<Card
			style={{
				...$listCard,
				...GS.mt5,
				paddingTop: 4,
				backgroundColor: "#DCD6D6",
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
									Resend
								</ListItem>
							</View>
						</View>

						<TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
							{!showMenu ? (
								<Ionicons name="ellipsis-vertical-outline" size={24} color={colors.primary} />
							) : (
								<Entypo name="cross" size={24} color={colors.primary} />
							)}
						</TouchableOpacity>
					</View>
				</View>
			}
			ContentComponent={<ListItemContent {...props} onPressIn={() => setShowMenu(!showMenu)} />}
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
	dropdownTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},
	estimate: {
		alignItems: "center",
		backgroundColor: "#E8EBF8",
		borderRadius: 5,
		flexDirection: "row",
		justifyContent: "space-between",
		marginLeft: "auto",
		marginRight: 10,
		paddingVertical: 2,
	},
	firstContainer: {
		alignItems: "center",
		flexDirection: "row",
	},
	mainContainer: {
		borderColor: "#1B005D",
		borderRadius: 20,
		borderWidth: 0.5,
		height: 180,
		justifyContent: "space-around",
		padding: 10,
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
	scrollRight: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		elevation: 10,
		height: 27,
		justifyContent: "center",
		opacity: 0.2,
		padding: 5,
		position: "absolute",
		right: 0,
		shadowColor: "rgba(0,0,0,0.16)",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		shadowRadius: 15,
		width: 28,
	},
	statusIcon: {
		bottom: 0,
		position: "absolute",
		right: -4,
	},
	taskNumberStyle: {},
	timeHeading: {
		color: "#7E7991",
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 10,
		opacity: 0.2,
	},
	timeNumber: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		opacity: 0.2,
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
