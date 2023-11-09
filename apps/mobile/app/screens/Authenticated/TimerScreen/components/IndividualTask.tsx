/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useCallback, useMemo, useState } from "react"
import { View, StyleSheet, Text, ImageStyle, TouchableOpacity } from "react-native"
import { Entypo, EvilIcons } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography, useAppTheme } from "../../../../theme"
import DeletePopUp from "./DeletePopUp"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"
import TaskStatus from "../../../../components/TaskStatus"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import IssuesModal from "../../../../components/IssuesModal"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { cloneDeep } from "lodash"

export interface Props {
	task: ITeamTask
	handleActiveTask: (value: ITeamTask) => unknown
	closeCombo?: () => unknown
	onReopenTask: () => unknown
	setEditMode: (val: boolean) => void
	isScrolling: boolean
	parentTasksFilter: boolean
	childTask?: ITeamTask
	onDismiss?: () => void
	onTaskPress?: (relatedTask: ITeamTask) => void
	isLinkedTasks: boolean
}

const IndividualTask: FC<Props> = observer(
	({
		task,
		handleActiveTask,
		closeCombo,
		onReopenTask,
		setEditMode,
		isScrolling,
		parentTasksFilter,
		childTask,
		onDismiss,
		onTaskPress,
		isLinkedTasks,
	}) => {
		const { colors } = useAppTheme()
		const [showDel, setShowDel] = useState(false)
		const { updateTask } = useTeamTasks()

		const onCloseTask = async () => {
			await updateTask(
				{
					...task,
					status: "closed",
				},
				task.id,
			)
			closeCombo()
		}

		const setParent = useCallback(
			async (
				parentTask: ITeamTask,
				newTask: ITeamTask,
				closeModal: () => void,
			): Promise<void> => {
				if (parentTask.issueType !== "Epic") return

				const childTask = cloneDeep(newTask)

				await updateTask(
					{
						...childTask,
						parentId: parentTask.id,
						parent: parentTask,
					},
					childTask.id,
				)

				closeModal()
			},
			[task],
		)

		// Display two first users profile image
		const assigneeImg1 = useMemo(() => task?.members[0]?.user?.imageUrl, [task])
		const assigneeImg2 = useMemo(() => task?.members[1]?.user?.imageUrl, [task])

		return (
			<TouchableOpacity
				style={styles.container}
				onPress={() => {
					closeCombo()
					setEditMode(false)
				}}
			>
				<View
					onTouchEnd={() => {
						isLinkedTasks
							? onTaskPress(task)
							: !parentTasksFilter
							? !isScrolling && handleActiveTask(task)
							: !isScrolling && setParent(task, childTask, onDismiss)
					}} // added it here because doesn't work when assigned to the parent
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						width: "60%",
					}}
				>
					<View style={styles.wrapTaskNumber}>
						<IssuesModal task={task} readonly={true} />
						<Text
							style={{ color: "#9490A0", fontSize: 12, marginLeft: 5 }}
						>{`#${task.taskNumber}`}</Text>
					</View>

					<Text style={[styles.taskTitle, { color: colors.primary }]} numberOfLines={2}>
						{limitTextCharaters({ text: task.title, numChars: 20 })}
					</Text>
				</View>
				<View
					onTouchEnd={() => {
						isLinkedTasks
							? onTaskPress(task)
							: !parentTasksFilter
							? !isScrolling && handleActiveTask(task)
							: !isScrolling && setParent(task, childTask, onDismiss)
					}} // added it here because doesn't work when assigned to the parent
					style={{
						flexDirection: "row",
						width: "40%",
						alignItems: "center",
						zIndex: 1000,
						justifyContent: "space-between",
					}}
				>
					<View>
						<TaskStatus
							iconsOnly={true}
							task={task}
							containerStyle={styles.statusContainer}
						/>
					</View>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							width: "35%",
						}}
					>
						<View style={{ flexDirection: "row" }}>
							{assigneeImg1 ? (
								<Avatar.Image
									source={{ uri: assigneeImg1 }}
									size={24}
									style={$usersProfile}
								/>
							) : task.members[0] ? (
								<Avatar.Text
									label={imgTitleProfileAvatar(task.members[0]?.user?.name)}
									size={24}
									style={[$usersProfile, { backgroundColor: "#82c9e0" }]}
									labelStyle={styles.prefix}
								/>
							) : null}

							{assigneeImg2 ? (
								<Avatar.Image
									source={{ uri: assigneeImg2 }}
									size={24}
									style={$usersProfile2}
								/>
							) : task.members[1] ? (
								<Avatar.Text
									label={imgTitleProfileAvatar(task.members[1]?.user?.name)}
									size={24}
									style={[$usersProfile2, { backgroundColor: "#82c9e0" }]}
									labelStyle={styles.prefix}
								/>
							) : null}
						</View>

						{task.status === "closed" ? (
							<EvilIcons
								name="refresh"
								size={24}
								color="#8F97A1"
								onPress={() => onReopenTask()}
							/>
						) : (
							<View onTouchStart={() => setShowDel(true)}>
								<Entypo name="cross" size={15} color="#8F97A1" />
							</View>
						)}
						{showDel && (
							<DeletePopUp
								onCloseTask={onCloseTask}
								setEditMode={setEditMode}
								setShowDel={setShowDel}
							/>
						)}
					</View>
				</View>
			</TouchableOpacity>
		)
	},
)

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderTopColor: "rgba(0, 0, 0, 0.06)",
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 12,
		width: "100%",
		zIndex: 1000,
	},
	prefix: {
		color: "#FFFFFF",
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 20,
	},
	statusContainer: {
		alignItems: "center",
		backgroundColor: "#ECE8FC",
		borderColor: "transparent",
		height: 27,
		marginRight: 6,
		paddingHorizontal: 7,
		width: 50,
		zIndex: 1000,
	},
	statusDisplay: {
		flexDirection: "row",
	},
	taskTitle: {
		color: "#282048",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
		width: "67%",
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
	wrapTaskNumber: {
		alignItems: "center",
		flexDirection: "row",
	},
})

const $usersProfile: ImageStyle = {
	...GS.roundedFull,
	backgroundColor: colors.background,
	width: spacing.extraLarge - spacing.tiny,
	height: spacing.extraLarge - spacing.tiny,
	borderColor: "#fff",
	borderWidth: 2,
}

const $usersProfile2: ImageStyle = {
	...GS.roundedFull,
	backgroundColor: colors.background,
	width: spacing.extraLarge - spacing.tiny,
	height: spacing.extraLarge - spacing.tiny,
	borderColor: "#fff",
	borderWidth: 2,
	position: "absolute",
	left: -15,
}

export default IndividualTask
