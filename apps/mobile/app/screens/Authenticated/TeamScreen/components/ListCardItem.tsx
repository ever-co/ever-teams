/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React from "react"
import {
	View,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	TouchableWithoutFeedback,
} from "react-native"
import { Ionicons, Entypo } from "@expo/vector-icons"

// COMPONENTS
import { Card, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import AllTaskStatuses from "../../../../components/AllTaskStatuses"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import {
	I_TeamMemberCardHook,
	I_TMCardTaskEditHook,
	useTeamMemberCard,
	useTMCardTaskEdit,
} from "../../../../services/hooks/features/useTeamMemberCard"
import UserHeaderCard from "./UserHeaderCard"
import TaskInfo from "./TaskInfo"
import { observer } from "mobx-react-lite"
import { TodayWorkedTime } from "./TodayWorkTime"
import { TimeProgressBar } from "./TimeProgressBar"
import { useNavigation } from "@react-navigation/native"
import { WorkedOnTask } from "./WorkedOnTask"

export type ListItemProps = {
	member: OT_Member
}

interface IcontentProps {
	memberInfo: I_TeamMemberCardHook
	taskEdition: I_TMCardTaskEditHook
	onPressIn?: () => unknown
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<IcontentProps> = observer(
	({ memberInfo, taskEdition, onPressIn }) => {
		// HOOKS
		const { colors, dark } = useAppTheme()
		return (
			<TouchableWithoutFeedback onPress={() => onPressIn()}>
				<View
					style={[
						{
							...GS.p3,
							...GS.positionRelative,
							backgroundColor: dark ? "#1E2025" : colors.background,
						},
						{ borderRadius: 14 },
					]}
				>
					<View style={styles.firstContainer}>
						<UserHeaderCard user={memberInfo.memberUser} member={memberInfo.member} />
						<View style={styles.wrapTotalTime}>
							<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} memberInfo={memberInfo} />
						</View>
					</View>

					<View style={[styles.wrapTaskTitle, { borderTopColor: colors.divider }]}>
						<TaskInfo
							editMode={taskEdition.editMode}
							setEditMode={taskEdition.setEditMode}
							memberInfo={memberInfo}
						/>
						<AllTaskStatuses task={memberInfo.memberTask} />
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
							<View style={{ ...GS.alignCenter }}>
								<WorkedOnTask period="Daily" memberInfo={memberInfo} />
							</View>

							<View style={{ ...GS.alignCenter }}>
								<WorkedOnTask period="Total" memberInfo={memberInfo} />
							</View>

							{memberInfo.memberTask && taskEdition.estimateEditMode ? (
								<View style={styles.estimate}>
									<EstimateTime
										setEditEstimate={taskEdition.setEstimateEditMode}
										currentTask={memberInfo.memberTask}
									/>
								</View>
							) : (
								<TimeProgressBar
									isAuthUser={memberInfo.isAuthUser}
									memberInfo={memberInfo}
									onPress={() => taskEdition.setEstimateEditMode(true)}
								/>
							)}
						</View>
					</View>
				</View>
			</TouchableWithoutFeedback>
		)
	},
)

const ListCardItem: React.FC<Props> = (props) => {
	const { colors } = useAppTheme()
	// // STATS
	const [showMenu, setShowMenu] = React.useState(false)
	const memberInfo = useTeamMemberCard(props.member)
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask)

	const { isTeamManager } = useOrganizationTeam()

	const navigation = useNavigation()

	const onPressIn = () => {
		taskEdition.setEditMode(false)
		taskEdition.setEstimateEditMode(false)
		setShowMenu(false)
		navigation.navigate(
			"Profile" as never,
			{ userId: memberInfo.memberUser.id, activeTab: "worked" } as never,
		)
	}

	return (
		<Card
			style={{
				...$listCard,
				...GS.mt5,
				paddingTop: 4,
				backgroundColor: !props.member?.employee?.isActive
					? "suspended"
					: props.member?.employee?.isOnline || props.member?.timerStatus === "running"
					? "#9FDAB7"
					: !props.member?.totalTodayTasks?.length
					? "#F1A2A2"
					: "#EBC386",
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
								paddingHorizontal: 20,
								...GS.noBorder,
								...GS.r0,
								...GS.zIndexFront,
								...GS.shadowLg,
								shadowColor: "rgba(0, 0, 0, 0.52)",
								borderRadius: 14,
								width: 172,
								marginTop: -5,
								marginRight: 17,
								backgroundColor: colors.background,
								minWidth: spacing.huge * 2,
								...(!showMenu ? { display: "none" } : {}),
							}}
						>
							<View style={{ marginVertical: 10 }}>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => {
										taskEdition.setEditMode(true)
										setShowMenu(false)
									}}
								>
									Edit Task
								</ListItem>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => {
										taskEdition.setEstimateEditMode(true)
										setShowMenu(false)
									}}
								>
									Estimate
								</ListItem>
								<ListItem textStyle={[styles.dropdownTxt, { color: colors.primary }]}>
									Assign Task
								</ListItem>
								<ListItem textStyle={[styles.dropdownTxt, { color: colors.primary }]}>
									Unassign Task
								</ListItem>

								{isTeamManager ? (
									<>
										{/* {!isAuthUser && ( */}
										<ListItem
											textStyle={[styles.dropdownTxt, { color: colors.primary }]}
											onPress={() => {
												setShowMenu(false)
												memberInfo.makeMemberManager()
											}}
										>
											Make a Manager
										</ListItem>
										{/* )} */}
										<ListItem
											textStyle={[styles.dropdownTxt, { color: "#DE5536" }]}
											style={{}}
											onPress={() => {
												setShowMenu(false)
												memberInfo.removeMemberFromTeam()
											}}
										>
											Remove
										</ListItem>
									</>
								) : null}
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
			ContentComponent={
				<ListItemContent taskEdition={taskEdition} memberInfo={memberInfo} onPressIn={onPressIn} />
			}
		/>
	)
}

export default ListCardItem

const $listCard: ViewStyle = {
	...GS.flex1,
	...GS.p0,
	borderWidth: 0,
	...GS.shadowSm,
	...GS.roundedMd,
	minHeight: null,
	shadowOffset: { width: 0, height: 0 },
}

const styles = StyleSheet.create({
	dropdownTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		height: 38,
		width: "100%",
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
		width: "95%",
	},
	times: {
		alignItems: "center",
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingTop: 16,
	},
	wrapTaskTitle: {
		borderTopWidth: 1,
		marginTop: 16,
		paddingVertical: 16,
		width: "98%",
	},
	wrapTotalTime: {
		alignItems: "center",
		justifyContent: "center",
		marginRight: 30,
		position: "absolute",
		right: 0,
	},
})
