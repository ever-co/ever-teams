/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useAppTheme } from "../app"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { typography } from "../theme"
import { useTaskPriority } from "../services/hooks/features/useTaskPriority"
import TaskPriorityPopup from "./TaskPriorityPopup"
import { BadgedTaskPriority } from "./PriorityIcon"
import { translate } from "../i18n"

interface TaskPriorityProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
}

const TaskPriority: FC<TaskPriorityProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const { allTaskPriorities } = useTaskPriority()
	const [openModal, setOpenModal] = useState(false)

	const currentPriority = useMemo(
		() => allTaskPriorities.find((s) => s.name === task?.priority),
		[task?.priority, allTaskPriorities],
	)

	const onChangePriority = async (text) => {
		if (task) {
			const taskEdit = {
				...task,
				priority: text,
			}

			await updateTask(taskEdit, task.id)
		}
	}

	return (
		<>
			<TaskPriorityPopup
				priorityName={task?.priority}
				visible={openModal}
				setSelectedPriority={(e) => onChangePriority(e.name)}
				onDismiss={() => setOpenModal(false)}
			/>
			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View
					style={{
						...styles.container,
						...containerStyle,
						backgroundColor: currentPriority?.color,
					}}
				>
					{task && task.priority ? (
						<BadgedTaskPriority iconSize={14} TextSize={10} priority={task.priority} />
					) : (
						<Text style={{ ...styles.text, color: colors.primary }}>
							{translate("settingScreen.priorityScreen.priorities")}
						</Text>
					)}
					<AntDesign name="down" size={14} color={colors.primary} />
				</View>
			</TouchableOpacity>
		</>
	)
})

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.16)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 8,
	},
	text: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
	},
})

export default TaskPriority
