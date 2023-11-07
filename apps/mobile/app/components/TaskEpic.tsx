/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, Text, View, ViewStyle } from "react-native"
import React, { useCallback, useMemo, useState } from "react"
import { TouchableOpacity } from "react-native-gesture-handler"
import { ITeamTask } from "../services/interfaces/ITask"
import { typography, useAppTheme } from "../theme"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { cloneDeep } from "lodash"
import { SvgXml } from "react-native-svg"
import { categoryIcon } from "./svgs/icons"
import TaskEpicPopup from "./TaskEpicPopup"
import { Entypo } from "@expo/vector-icons"
import { translate } from "../i18n"

interface ITaskEpic {
	task: ITeamTask
	containerStyle?: ViewStyle
}

export type formattedEpic = {
	[key: string]: {
		icon: React.ReactNode
		id: string
		name: string
		value: string
	}
}

const TaskEpic: React.FC<ITaskEpic> = ({ containerStyle, task }) => {
	const { colors, dark } = useAppTheme()
	const { updateTask } = useTeamTasks()

	const [openModal, setOpenModal] = useState<boolean>(false)

	const { teamTasks } = useTeamTasks()

	const epicsList = useMemo(() => {
		const temp: formattedEpic = {}
		teamTasks.forEach((task) => {
			if (task.issueType === "Epic") {
				temp[`#${task.taskNumber} ${task.title}`] = {
					id: task.id,
					name: `#${task.taskNumber} ${task.title}`,
					value: task.id,
					icon: (
						<View
							style={{
								backgroundColor: "#8154BA",
								borderRadius: 4,
								marginVertical: 5,
								padding: 4,
							}}
						>
							<SvgXml xml={categoryIcon} />
						</View>
					),
				}
			}
		})
		return temp
	}, [teamTasks])

	const onTaskSelect = useCallback(
		async (parentTask: ITeamTask | undefined) => {
			if (!parentTask) return
			const childTask = cloneDeep(task)

			await updateTask(
				{
					...childTask,
					parentId: parentTask.id ? parentTask.id : null,
					parent: parentTask.id ? parentTask : null,
				},
				task?.id,
			)
		},
		[task, updateTask],
	)
	return (
		<>
			<TaskEpicPopup
				visible={openModal}
				onDismiss={() => setOpenModal(false)}
				onTaskSelect={onTaskSelect}
				epicsList={epicsList}
				currentEpic={task?.parent?.id}
				teamTasks={teamTasks}
			/>

			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View
					style={{
						...styles.container,
						...containerStyle,
						borderColor: colors.border,
						borderWidth: !task?.parent ? 1 : 0,
						backgroundColor: dark || !task?.parent ? colors.background : "#f2f2f2",
					}}
				>
					{task?.parent ? (
						<>
							<View style={styles.epicParentIconWrapper}>
								<SvgXml xml={categoryIcon} />
							</View>
							<Text
								ellipsizeMode="tail"
								numberOfLines={1}
								style={[
									styles.text,
									{
										color: colors.primary,
									},
								]}
							>{`#${task?.parent?.number} ${task?.parent?.title}`}</Text>
						</>
					) : (
						<>
							<Entypo name="circle" size={12} color={colors.primary} />
							<Text
								style={{
									...styles.text,
									fontSize: 12,
									color: colors.primary,
									marginLeft: 5,
								}}
							>
								{translate("taskDetailsScreen.epic")}
							</Text>
						</>
					)}
				</View>
			</TouchableOpacity>
		</>
	)
}

export default TaskEpic

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.16)",
		borderRadius: 10,
		flexDirection: "row",
		gap: 3,
		justifyContent: "space-between",
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 8,
	},
	epicParentIconWrapper: {
		backgroundColor: "#8154BA",
		borderRadius: 4,
		marginVertical: 5,
		padding: 4,
	},
	text: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
		textTransform: "capitalize",
		width: "90%",
	},
})
