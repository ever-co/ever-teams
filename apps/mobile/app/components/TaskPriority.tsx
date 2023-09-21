/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"
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
	priority?: string
	setPriority?: (priority: string) => unknown
}

const TaskPriority: FC<TaskPriorityProps> = observer(
	({ task, containerStyle, priority, setPriority }) => {
		const { colors } = useAppTheme()
		const { updateTask } = useTeamTasks()
		const [openModal, setOpenModal] = useState(false)

		const allTaskPriorities = useTaskPriorityValue()

		const sizeValue = (
			task?.priority?.split("-").join(" ") ||
			(priority && priority.split("-").join(" "))
		)?.toLowerCase()

		const currentPriority =
			allTaskPriorities &&
			Object.values(allTaskPriorities).find((item) => item.name.toLowerCase() === sizeValue)

		const onChangePriority = async (text) => {
			if (task) {
				const taskEdit = {
					...task,
					priority: text,
				}

				await updateTask(taskEdit, task.id)
			} else {
				setPriority(text)
			}
		}

		return (
			<>
				<TaskPriorityPopup
					priorityName={task?.priority}
					visible={openModal}
					setSelectedPriority={(e) => onChangePriority(e.value)}
					onDismiss={() => setOpenModal(false)}
				/>
				<TouchableOpacity onPress={() => setOpenModal(true)}>
					<View
						style={{
							...styles.container,
							...containerStyle,
							borderColor: colors.border,
							backgroundColor: currentPriority?.bgColor,
						}}
					>
						{(task?.priority || priority) && currentPriority ? (
							<View style={styles.wrapStatus}>
								{currentPriority.icon}
								<Text style={{ ...styles.text, marginLeft: 10 }}>
									{limitTextCharaters({ text: currentPriority.name, numChars: 15 })}
								</Text>
							</View>
						) : (
							<View style={styles.wrapStatus}>
								<Entypo name="circle" size={12} color={colors.primary} />
								<Text style={{ ...styles.text, color: colors.primary, marginLeft: 5 }}>
									{translate("settingScreen.priorityScreen.priorities")}
								</Text>
							</View>
						)}
						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
			</>
		)
	},
)

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
