/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { typography, useAppTheme } from "../theme"
import TaskPriorityPopup from "./TaskPriorityPopup"
import { translate } from "../i18n"
import { useTaskPriorityValue } from "./StatusType"
import { limitTextCharaters } from "../helpers/sub-text"

interface TaskPriorityProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
}

const TaskPriority: FC<TaskPriorityProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const [openModal, setOpenModal] = useState(false)

	const allTaskPriorities = useTaskPriorityValue()
	const currentPriority = allTaskPriorities[task?.priority?.split("-").join(" ")]

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
						backgroundColor: currentPriority?.bgColor,
					}}
				>
					{task && task.priority && currentPriority ? (
						<View style={styles.wrapStatus}>
							{currentPriority.icon}
							<Text style={{ ...styles.text, marginLeft: 10 }}>
								{limitTextCharaters({ text: currentPriority.name, numChars: 15 })}
							</Text>
						</View>
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
	wrapStatus: {
		alignItems: "center",
		flexDirection: "row",
		width: "70%",
	},
})

export default TaskPriority
