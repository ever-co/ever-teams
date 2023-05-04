/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from "react"
import {
	View,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	TouchableWithoutFeedback,
} from "react-native"
import { Avatar, Text } from "react-native-paper"
import { Ionicons, Entypo, MaterialCommunityIcons } from "@expo/vector-icons"
import { AnimatedCircularProgress } from "react-native-circular-progress"

// COMPONENTS
import { Card, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { useStores } from "../../../../models"
import { pad } from "../../../../helpers/number"
import { useTimer } from "../../../../services/hooks/useTimer"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import WorkedOnTask from "../../../../components/WorkedOnTask"
import { translate } from "../../../../i18n"
import AllTaskStatuses from "../../../../components/AllTaskStatuses"
import { secondsToTime } from "../../../../helpers/date"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { imgTitle } from "../../../../helpers/img-title"

export type ListItemProps = {
	member: OT_Member
	onPressIn?: ({
		userId,
		tab,
	}: {
		userId: string
		tab: "worked" | "assigned" | "unassigned"
	}) => unknown
	enableEstimate: boolean
	index: number
	userStatus: string
}
interface IUserStatus {
	icon: any
	color: string
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = observer(
	({ member, enableEstimate, onPressIn, userStatus }) => {
		// HOOKS
		const {
			teamStore: { activeTeam },
			TaskStore: { activeTask },
			TimerStore: { timeCounterState },
			authenticationStore: { user },
		} = useStores()
		const {
			fomatedTimeCounter: { hours, minutes },
		} = useTimer()

		const { colors, dark } = useAppTheme()
		const isAuthUser = member.employee.userId === user?.id
		const [editEstimate, setEditEstimate] = useState(false)
		const [estimatedTime, setEstimateTime] = useState({
			hours: 0,
			minutes: 0,
			seconds: 0,
		})
		const [memberTask, setMemberTask] = useState<ITeamTask | null>(null)
		const iuser = member.employee.user

		useEffect(() => {
			if (isAuthUser) {
				setMemberTask(activeTask)
			}
		}, [isAuthUser, activeTask, activeTeam])

		const progress = useMemo(() => {
			if (memberTask && memberTask.estimate > 0) {
				const percent = timeCounterState / 100 / memberTask.estimate
				return Math.floor(percent * 10)
			}

			return 0
		}, [timeCounterState])

		useEffect(() => {
			if (memberTask) {
				const { h, m, s } = secondsToTime(memberTask.estimate)
				setEstimateTime({
					hours: h,
					minutes: m,
					seconds: s,
				})
			}
		}, [memberTask, enableEstimate])

		return (
			<TouchableWithoutFeedback onPress={() => onPressIn({ userId: iuser?.id, tab: "worked" })}>
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
						<View style={styles.wrapProfileImg}>
							{iuser.image?.thumbUrl || iuser.imageUrl || iuser.image?.fullUrl ? (
								<Avatar.Image
									style={styles.teamImage}
									size={40}
									source={{ uri: iuser.image?.thumbUrl || iuser.imageUrl || iuser.image?.fullUrl }}
								/>
							) : (
								<Avatar.Text
									style={styles.teamImage}
									size={40}
									label={imgTitle(iuser.name)}
									labelStyle={styles.prefix}
								/>
							)}
							<Avatar.Image
								style={styles.statusIcon}
								size={20}
								source={getStatusImage(userStatus).icon}
							/>
						</View>
						<Text style={[styles.name, { color: colors.primary }]}>{iuser.name}</Text>
						{/* ENABLE ESTIMATE INPUTS */}
						<View style={styles.wrapTotalTime}>
							<WorkedOnTask
								memberTask={memberTask}
								isAuthUser={isAuthUser}
								title={translate("teamScreen.cardTotalTimeLabel")}
								containerStyle={{ alignItems: "center", justifyContent: "center" }}
								totalTimeText={{
									marginTop: 5,
									fontSize: 12,
									color: colors.primary,
									fontFamily: typography.primary.semiBold,
								}}
							/>
						</View>
					</View>
					<View style={[styles.wrapTaskTitle, { borderTopColor: colors.divider }]}>
						<View style={{ flexDirection: "row", width: "100%" }}>
							<View style={styles.wrapBugIcon}>
								<MaterialCommunityIcons name="bug-outline" size={14} color="#fff" />
							</View>
							{memberTask ? (
								<Text style={[styles.otherText, { color: colors.primary }]}>
									<Text style={styles.taskNumberStyle}>#{memberTask?.taskNumber}</Text>{" "}
									{memberTask &&
										limitTextCharaters({ text: memberTask && memberTask.title, numChars: 64 })}
								</Text>
							) : null}
						</View>
						<AllTaskStatuses task={memberTask} />
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
									{pad(hours)} h:{pad(minutes)} m
								</Text>
							</View>
							<View style={{ ...GS.alignCenter }}>
								<WorkedOnTask
									memberTask={memberTask}
									isAuthUser={isAuthUser}
									title={translate("teamScreen.cardTotalWorkLabel")}
									containerStyle={{
										alignItems: "center",
										height: "80%",
										justifyContent: "space-between",
									}}
									totalTimeText={{
										fontSize: 14,
										color: colors.primary,
										fontFamily: typography.fonts.PlusJakartaSans.semiBold,
									}}
								/>
							</View>
							{memberTask && editEstimate ? (
								<View style={styles.estimate}>
									<EstimateTime setEditEstimate={setEditEstimate} currentTask={memberTask} />
								</View>
							) : (
								<View style={{}}>
									<TouchableOpacity onPress={() => setEditEstimate(true)}>
										<AnimatedCircularProgress
											size={48}
											width={5}
											fill={progress}
											tintColor="#27AE60"
											backgroundColor="#F0F0F0"
										>
											{() => (
												<Text style={{ ...styles.progessText, color: colors.primary }}>
													{estimatedTime.hours > 0
														? estimatedTime.hours + " H"
														: estimatedTime.minutes > 0
														? estimatedTime.minutes + " Min"
														: "0 H"}
												</Text>
											)}
										</AnimatedCircularProgress>
									</TouchableOpacity>
								</View>
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
	const { isTeamManager, currentUser, makeMemberAsManager, removeMemberFromTeam } =
		useOrganizationTeam()

	// STATS
	const [showMenu, setShowMenu] = React.useState(false)
	const [estimateNow, setEstimateNow] = React.useState(false)

	const handleEstimate = () => {
		setEstimateNow(true)
		setShowMenu(false)
	}

	const { index, userStatus, onPressIn, member } = props
	const iuser = member.employee.user
	const isAuthUser = member.employee.userId === currentUser?.id
	return (
		<Card
			style={{
				...$listCard,
				...GS.mt5,
				paddingTop: 4,
				backgroundColor: getStatusImage(userStatus).color,
				zIndex: 999 - index,
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
								<ListItem textStyle={[styles.dropdownTxt, { color: colors.primary }]}>
									Edit Task
								</ListItem>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => handleEstimate()}
								>
									Estimate
								</ListItem>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => {
										onPressIn({ userId: iuser?.id, tab: "unassigned" })
										setShowMenu(!showMenu)
									}}
								>
									Assign Task
								</ListItem>
								<ListItem
									textStyle={[styles.dropdownTxt, { color: colors.primary }]}
									onPress={() => {
										onPressIn({ userId: iuser?.id, tab: "assigned" })
										setShowMenu(!showMenu)
									}}
								>
									Unassign Task
								</ListItem>

								{isTeamManager ? (
									<>
										{!isAuthUser && (
											<ListItem
												textStyle={[styles.dropdownTxt, { color: colors.primary }]}
												onPress={() => {
													setShowMenu(false)
													makeMemberAsManager(member.employee.id)
												}}
											>
												Make a Manager
											</ListItem>
										)}
										<ListItem
											textStyle={[styles.dropdownTxt, { color: "#DE5536" }]}
											style={{}}
											onPress={() => {
												setShowMenu(false)
												removeMemberFromTeam(member.employee.id)
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
				<ListItemContent
					{...props}
					enableEstimate={estimateNow}
					// onPressIn={() => {
					//   props.onPressIn
					//   setShowMenu(false)
					// }}
				/>
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
	name: {
		color: "#1B005D",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		left: 15,
	},
	otherText: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontStyle: "normal",
		width: "95%",
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
	},
	progessText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 10,
	},
	statusIcon: {
		bottom: 0,
		position: "absolute",
		right: -4,
	},
	taskNumberStyle: {
		color: "#7B8089",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},
	teamImage: {
		backgroundColor: "#C1E0EA",
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
	},
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 10,
		fontWeight: "500",
		marginBottom: 9,
	},
	wrapBugIcon: {
		alignItems: "center",
		backgroundColor: "#C24A4A",
		borderRadius: 3,
		height: 20,
		justifyContent: "center",
		marginRight: 3,
		width: 20,
	},
	wrapProfileImg: {
		flexDirection: "row",
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

const getStatusImage = (status: string) => {
	let res: IUserStatus
	if (status === "online") {
		res = {
			icon: require("../../../../../assets/icons/new/play-small.png"),
			color: "#88D1A5",
		}
	} else if (status === "pause") {
		res = {
			icon: require("../../../../../assets/icons/new/on-pause.png"),
			color: "#EBC386",
		}
	} else {
		res = {
			icon: require("../../../../../assets/icons/new/away.png"),
			color: "#F1A2A2",
		}
	}
	return res
}
