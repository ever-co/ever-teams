/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { ITaskStatus, ITeamTask } from "../services/interfaces/ITask"
import { BadgedTaskStatus } from "./StatusIcon"
import { observer } from "mobx-react-lite"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { useAppTheme } from "../app"
import TaskStatusPopup from "./TaskStatusPopup"
import { useTaskStatus } from "../services/hooks/features/useTaskStatus"
import { typography } from "../theme"
import { translate } from "../i18n"

interface TaskStatusProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
}

const TaskStatus: FC<TaskStatusProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const { allStatuses } = useTaskStatus()
	const [openModal, setOpenModal] = useState(false)

	const currentStatus = useMemo(
		() => allStatuses.find((s) => s.name === task?.status),
		[task?.status, allStatuses],
	)

	const onChangeStatus = async (text) => {
		if (task) {
			const value: ITaskStatus = text
			const taskEdit = {
				...task,
				status: value,
			}

			await updateTask(taskEdit, task.id)
		}
	}

	return (
		<>
			<TaskStatusPopup
				statusName={task?.status}
				visible={openModal}
				setSelectedStatus={(e) => onChangeStatus(e.name)}
				onDismiss={() => setOpenModal(false)}
			/>
			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View
					style={{
						...styles.container,
						...containerStyle,
						backgroundColor: currentStatus?.color,
					}}
				>
					{task && task.status ? (
						<BadgedTaskStatus iconSize={14} TextSize={10} status={task.status} />
					) : (
						<Text style={{ ...styles.text, color: colors.primary }}>
							{translate("settingScreen.statusScreen.statuses")}
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

export default TaskStatus
