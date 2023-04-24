import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import {
	View,
	ViewStyle,
	Image,
	ImageStyle,
	TouchableNativeFeedback,
	TouchableOpacity,
	StyleSheet,
	TextInput,
	Dimensions,
	FlatList,
} from "react-native"
import { Ionicons, AntDesign, Entypo } from "@expo/vector-icons"
import { Card, Text, Avatar, Button, ActivityIndicator } from "react-native-paper"
import { LinearGradient } from "expo-linear-gradient"
import { AnimatedCircularProgress } from "react-native-circular-progress"

// COMPONENTS
import { Icon, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { useStores } from "../../../../models"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { IUser } from "../../../../services/interfaces/IUserData"
import { useTimer } from "../../../../services/hooks/useTimer"
import { pad } from "../../../../helpers/number"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import WorkedDayHours from "../../../../components/WorkedDayHours"
import WorkedOnTask from "../../../../components/WorkedOnTask"
import TaskStatus from "../../../../components/TaskStatus"
import LabelItem from "../../../../components/LabelItem"
import { secondsToTime } from "../../../../helpers/date"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import TimerButton from "./TimerButton"
import { observer } from "mobx-react-lite"

export type ListItemProps = {
	item: ITeamTask
	onPressIn?: () => unknown
	handleEstimate?: () => unknown
	onAssignTask?: (taskId: string) => unknown
	onUnassignTask?: (taskId: string) => unknown
	isActive: boolean
	tabIndex: number
	enableEstimate?: boolean
	enableEditTaskTitle?: boolean
	handleTaskTitle?: () => unknown
	member: IUser
	index: number
}

export interface Props extends ListItemProps {}

const labels = [
	{
		id: 1,
		label: "Low",
		color: "#282048",
		background: ["#93E6BE", "#55C0D8", "#D4EFDF"],
		icon: require("../../../../../assets/icons/new/arrow-down.png"),
	},
	{
		id: 2,
		label: "Extra Large",
		color: "#282048",
		background: ["#F5B8B8", "#EF7070", "#F5B8B8"],
		icon: require("../../../../../assets/icons/new/maximize-3.png"),
	},
	{
		id: 3,
		label: "UIUX",
		color: "#9641AB",
		background: ["#EAD9EE"],
		icon: require("../../../../../assets/icons/new/devices.png"),
	},
	{
		id: 4,
		label: "Low",
		color: "#282048",
		background: ["#93E6BE", "#55C0D8", "#D4EFDF"],
		icon: require("../../../../../assets/icons/new/arrow-down.png"),
	},
]

const { width, height } = Dimensions.get("window")

export const ListItemContent: React.FC<ListItemProps> = observer((props) => {
	const { colors, dark } = useAppTheme()
	const {
		authenticationStore: { authToken, tenantId, organizationId, user },
		teamStore: { activeTeamId },
		TaskStore: { activeTask, setActiveTask },
		TimerStore: { timeCounterState, localTimerStatus },
	} = useStores()
	const {
		item,
		enableEditTaskTitle,
		enableEstimate,
		handleEstimate,
		handleTaskTitle,
		onPressIn,
		isActive,
		tabIndex,
		onAssignTask,
		member,
		onUnassignTask,
	} = props

	const {
		startTimer,
		stopTimer,
		getTimerStatus,
		toggleTimer,
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatusFetchingState,
		canRunTimer,
	} = useTimer()

	const { updateTask, setActiveTeamTask } = useTeamTasks()
	const flatListRef = useRef<FlatList>(null)
	const [labelIndex, setLabelIndex] = useState(0)
	const [titleInput, setTitleInput] = useState("")
	const [loading, setLoading] = useState(false)
	const [showTaskStatus, setShowTaskStatus] = useState(false)
	const [estimatedTime, setEstimateTime] = useState({
		hours: 0,
		minutes: 0,
		seconds: 0,
	})
	const [showMenu, setShowMenu] = React.useState(false)
	const [memberTask, setMemberTask] = useState<ITeamTask | null>(item)
	const isAuthUser = member.id === user?.id

	useEffect(() => {
		if (isAuthUser && isActive) {
			setMemberTask(activeTask)
		}
	})

	const onChangeTaskTitle = async () => {
		const task: ITeamTask = {
			...item,
			title: titleInput,
		}
		setLoading(true)
		await updateTask(task, task?.id)
		setLoading(false)
		handleTaskTitle()
	}

	const isAnAssignedTask = useMemo(() => {
		if (typeof item === "undefined") {
			return false
		}
		let exist
		if (typeof item.members !== "undefined") {
			exist = item.members.find((m) => m.userId === member.id)
		}
		return !!exist
	}, [])

	useEffect(() => {
		flatListRef.current?.scrollToIndex({
			animated: true,
			index: labelIndex,
			viewPosition: 0,
		})
	}, [labelIndex])

	const onNextPressed = () => {
		if (labelIndex === labels.length - 2) {
		} else {
			setLabelIndex(labelIndex + 1)
		}
	}

	const onPrevPressed = () => {
		if (labelIndex === 0) {
			return
		}
		setLabelIndex(labelIndex - 1)
	}

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
	}, [memberTask])

	useEffect(() => {
		setMemberTask(item)
	}, [item])

	return (
		<TouchableNativeFeedback
			onPressIn={() => {
				setShowMenu(false)
				setShowTaskStatus(false)
			}}
		>
			<View
				style={{
					...GS.p3,
					...GS.positionRelative,
					backgroundColor: colors.background,
					borderRadius: 14,
				}}
			>
				<View style={styles.firstContainer}>
					<WorkedOnTask
						memberTask={memberTask}
						isAuthUser={true}
						title={"Total time"}
						containerStyle={{ flexDirection: "row", alignItems: "center" }}
						totalTimeText={{ color: colors.primary }}
					/>
					<TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
						{!showMenu ? (
							<Ionicons name="ellipsis-vertical-outline" size={20} color={colors.primary} />
						) : (
							<Entypo name="cross" size={20} color={colors.primary} />
						)}
					</TouchableOpacity>
				</View>

				<View style={{ marginBottom: 16 }}>
					<View style={styles.wrapperTask}>
						<TouchableOpacity onLongPress={() => handleTaskTitle()}>
							<TextInput
								style={[
									styles.otherText,
									enableEditTaskTitle ? styles.titleEditMode : null,
									{ color: colors.primary },
								]}
								defaultValue={
									enableEditTaskTitle
										? titleInput
										: limitTextCharaters({ text: memberTask.title, numChars: 64 })
								}
								editable={enableEditTaskTitle}
								multiline={true}
								numberOfLines={2}
								onChangeText={(text) => setTitleInput(text)}
							/>
							{titleInput !== item.title &&
							titleInput.trim().length > 3 &&
							enableEditTaskTitle &&
							!loading ? (
								<AntDesign
									style={styles.checkBtn}
									name="check"
									size={24}
									onPress={() => onChangeTaskTitle()}
									color="green"
								/>
							) : null}
							{loading && <ActivityIndicator style={styles.checkBtn} />}
						</TouchableOpacity>
						<AnimatedCircularProgress
							size={48}
							width={5}
							fill={isActive ? progress : 0}
							tintColor="#27AE60"
							onAnimationComplete={() => {}}
							backgroundColor="#F0F0F0"
						>
							{(fill) => (
								<Text style={{ ...styles.progessText, color: colors.primary }}>
									{estimatedTime.hours > 0
										? estimatedTime.hours + " H"
										: estimatedTime.minutes > 0
										? estimatedTime.minutes + " Min"
										: "0 H"}
								</Text>
							)}
						</AnimatedCircularProgress>
					</View>

					<View style={styles.labelFlatList}>
						<FlatList
							data={labels}
							initialScrollIndex={labelIndex}
							renderItem={({ item, index, separators }) => (
								<View key={index} style={{ marginHorizontal: 2 }}>
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
						{labelIndex === labels.length - 2 ? null : (
							<TouchableOpacity
								activeOpacity={0.7}
								style={[styles.scrollRight, { backgroundColor: colors.background }]}
								onPress={() => onNextPressed()}
							>
								<AntDesign name="right" size={18} color={colors.primary} />
							</TouchableOpacity>
						)}
						{labelIndex !== 0 ? (
							<TouchableOpacity
								activeOpacity={0.7}
								style={[styles.scrollRight, { left: 0, backgroundColor: colors.background }]}
								onPress={() => onPrevPressed()}
							>
								<AntDesign name="left" size={18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
					</View>
				</View>

				<View style={[styles.times, { borderTopColor: colors.border }]}>
					<View style={{ flexDirection: "row", width: "50%", alignItems: "center" }}>
						{isAuthUser ? (
							<>
								{isActive ? (
									<>
										<TimerButton
											isActiveTask={isActive}
											isAssignedTask={isAnAssignedTask}
											task={item}
										/>
										<View style={{ justifyContent: "center", alignItems: "center", left: 10 }}>
											<Text style={styles.timeHeading}>Today work</Text>
											<Text style={[styles.timeNumber, { color: colors.primary }]}>
												{pad(hours)} h:{pad(minutes)} m
											</Text>
										</View>
									</>
								) : (
									<>
										<TouchableOpacity
											style={[
												styles.timerBtn,
												{ backgroundColor: colors.background, borderColor: colors.border },
											]}
											onPress={() => {
												setActiveTeamTask(item)
												startTimer()
											}}
										>
											<Image
												resizeMode="contain"
												style={styles.timerIcon}
												source={
													dark
														? require("../../../../../assets/icons/new/play-dark.png")
														: require("../../../../../assets/icons/new/play.png")
												}
											/>
										</TouchableOpacity>
										<View style={{ justifyContent: "center", alignItems: "center" }}>
											<Text style={[styles.timeHeading, { color: colors.tertiary }]}>
												Today work
											</Text>
											<Text style={[styles.timeNumber, { color: colors.primary }]}>01 h:01 m</Text>
										</View>
									</>
								)}
							</>
						) : (
							<>
								{!isAnAssignedTask ? (
									<TouchableOpacity
										style={[styles.timerBtn, { backgroundColor: "#fff" }]}
										onPress={() => onAssignTask(item.id)}
									>
										<Image
											resizeMode="contain"
											style={styles.timerIcon}
											source={require("../../../../../assets/icons/new/arrow-right.png")}
										/>
									</TouchableOpacity>
								) : null}
								<View style={{ left: 12, justifyContent: "center", alignItems: "center" }}>
									<Text style={[styles.timeHeading, { color: colors.tertiary }]}>Assigned by</Text>
									<Text style={[styles.timeNumber, { color: colors.primary }]}>
										{memberTask?.members.length} people
									</Text>
								</View>
							</>
						)}
					</View>
					<View>
						<TaskStatus containerStyle={styles.statusContainer} task={item} />
					</View>
				</View>

				{showMenu && <SidePopUp setShowMenu={() => setShowMenu(false)} props={props} />}
			</View>
		</TouchableNativeFeedback>
	)
})

interface IMenuProps {
	setShowMenu: () => unknown
	props: any
}
const SidePopUp: FC<IMenuProps> = ({ props, setShowMenu }) => {
	const { colors } = useAppTheme()
	const { onAssignTask, onUnassignTask, item } = props
	return (
		<View
			style={{
				...GS.positionAbsolute,
				...GS.p2,
				...GS.mt1,
				...GS.pt1,
				...GS.shadow,
				...GS.r0,
				...GS.rounded,
				...GS.border,
				borderColor: colors.border,
				...GS.zIndexFront,
				width: 120,
				shadowColor: colors.border,
				marginRight: 27,
				backgroundColor: colors.background,
				minWidth: spacing.huge * 2,
			}}
		>
			<View style={{}}>
				<ListItem textStyle={[styles.dropdownTxt, { color: colors.primary }]}>Edit Task</ListItem>
				<ListItem textStyle={[styles.dropdownTxt, { color: colors.primary }]} onPress={() => {}}>
					Estimate
				</ListItem>

				{onAssignTask && (
					<ListItem
						textStyle={[styles.dropdownTxt, { color: colors.primary }]}
						onPress={() => {
							onAssignTask(item.id)
							setShowMenu()
						}}
					>
						Assign Task
					</ListItem>
				)}

				{onUnassignTask && (
					<ListItem
						textStyle={[styles.dropdownTxt, { color: colors.primary }]}
						onPress={() => {
							onUnassignTask(item.id)
							setShowMenu()
						}}
					>
						Unassign Task
					</ListItem>
				)}
			</View>
		</View>
	)
}

const ListCardItem: React.FC<Props> = (props) => {
	const { colors, dark } = useAppTheme()
	const { isTeamManager } = useOrganizationTeam()
	// STATS
	const [showMenu, setShowMenu] = React.useState(false)
	const [estimateNow, setEstimateNow] = React.useState(false)
	const [editTaskTitle, setEditTaskTitle] = React.useState(false)

	const handleEstimate = () => {
		setEstimateNow(!estimateNow)
		setShowMenu(false)
	}
	const handleTaskTitle = () => {
		setEditTaskTitle(!editTaskTitle)
		setShowMenu(false)
	}

	const { index, member, isActive, item } = props
	const iuser = member

	return (
		<Card
			style={[
				{ borderRadius: 14 },
				!dark && isActive && { borderColor: "#8C7AE4", borderWidth: 3 },
			]}
		>
			{dark ? (
				<LinearGradient
					colors={["#B993E6", "#6EB0EC", "#5855D8"]}
					start={{ x: 0.1, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
					style={{ padding: isActive ? 3 : 0, borderRadius: 14 }}
				>
					<View style={{ backgroundColor: colors.background, borderRadius: 14 }}>
						<ListItemContent {...props} />
					</View>
				</LinearGradient>
			) : (
				<View style={{ backgroundColor: colors.background, borderRadius: 14 }}>
					<ListItemContent {...props} />
				</View>
			)}
		</Card>
	)
}

export default ListCardItem

const styles = StyleSheet.create({
	mainContainer: {
		borderColor: "#1B005D",
		borderRadius: 20,
		borderWidth: 0.5,
		justifyContent: "space-around",
	},
	times: {
		alignItems: "center",
		borderTopColor: "rgba(0, 0, 0, 0.06)",
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingTop: 14,
	},
	otherText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		lineHeight: 15,
		width: width / 1.7,
	},
	titleEditMode: {
		borderRadius: 5,
		borderWidth: 0.3,
		height: 40,
		minWidth: 220,
		paddingHorizontal: 5,
		width: 230,
	},
	timeNumber: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
	},
	dropdownTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},
	timeHeading: {
		color: "#7E7991",
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 10,
	},
	checkBtn: {
		position: "absolute",
		right: 0,
		top: 21,
	},
	//   // New
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.secondary.medium,
		fontSize: 10,
	},
	totalTimeTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
	},
	timerIcon: {
		height: 21,
		width: 21,
	},
	timerBtn: {
		alignItems: "center",
		borderColor: "rgba(0, 0, 0, 0.4)",
		borderRadius: 20,
		borderWidth: 1,
		elevation: 10,
		height: 42,
		justifyContent: "center",
		marginRight: 10,
		shadowColor: "rgba(0,0,0,0.16)",
		shadowOffset: { width: 5, height: 10 },
		shadowOpacity: 1,
		shadowRadius: 10,
		width: 42,
	},
	scrollRight: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		elevation: 10,
		height: 27,
		justifyContent: "center",
		padding: 5,
		position: "absolute",
		right: 0,
		shadowColor: "rgba(0,0,0,0.16)",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		shadowRadius: 15,
		width: 28,
	},
	firstContainer: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	wrapperTask: {
		flexDirection: "row",
		height: 42,
		justifyContent: "space-between",
	},
	labelFlatList: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
		width: "74%",
	},
	progessText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 10,
	},
	statusContainer: {
		alignItems: "center",
		borderColor: "transparent",
		height: 33,
		paddingHorizontal: 9,
		width: 120,
	},
})
