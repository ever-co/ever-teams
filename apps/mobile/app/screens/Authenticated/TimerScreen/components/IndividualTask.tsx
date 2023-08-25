/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useMemo, useState } from "react"
import { View, StyleSheet, Text, Image, ImageStyle, TouchableOpacity } from "react-native"
import { Entypo, EvilIcons, MaterialCommunityIcons } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography, useAppTheme } from "../../../../theme"
import DeletePopUp from "./DeletePopUp"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"
import TaskStatus from "../../../../components/TaskStatus"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"

export interface Props {
	task: ITeamTask
	handleActiveTask: (value: ITeamTask) => unknown
	closeCombo?: () => unknown
	onReopenTask: () => unknown
	setEditMode: (val: boolean) => unknown
}

const IndividualTask: FC<Props> = observer(
	({ task, handleActiveTask, closeCombo, onReopenTask, setEditMode }) => {
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

		// Display two fist users profile image
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
					onTouchStart={() => {
						handleActiveTask(task)
						setEditMode(false)
					}} // added it here because doesn't work when assigned to the parent
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						width: "60%",
					}}
				>
					<View style={styles.wrapTaskNumber}>
						<View style={styles.wrapBugIcon}>
							<MaterialCommunityIcons name="bug-outline" size={14} color="#fff" />
						</View>
						<Text
							style={{ color: "#9490A0", fontSize: 12, marginLeft: 5 }}
						>{`#${task.taskNumber}`}</Text>
					</View>

					<Text style={[styles.taskTitle, { color: colors.primary }]} numberOfLines={2}>
						{task.title}
					</Text>
				</View>
				<View
					onTouchStart={() => handleActiveTask(task)} // added it here because doesn't work when assigned to the parent
					style={{
						flexDirection: "row",
						width: "40%",
						alignItems: "center",
						zIndex: 1000,
						justifyContent: "space-between",
					}}
				>
					<View>
						<TaskStatus iconsOnly={true} task={task} containerStyle={styles.statusContainer} />
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
							{assigneeImg1 ? <Image source={{ uri: assigneeImg1 }} style={$usersProfile} /> : null}
							{assigneeImg2 ? (
								<Image source={{ uri: assigneeImg2 }} style={$usersProfile2} />
							) : null}
						</View>
						{task.status === "closed" ? (
							<EvilIcons name="refresh" size={24} color="#8F97A1" onPress={() => onReopenTask()} />
						) : (
							<View onTouchStart={() => setShowDel(true)}>
								<Entypo name="cross" size={15} color="#8F97A1" />
							</View>
						)}
						{showDel && <DeletePopUp onCloseTask={onCloseTask} setShowDel={setShowDel} />}
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
