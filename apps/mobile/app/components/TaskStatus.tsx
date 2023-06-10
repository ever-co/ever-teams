/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { ITaskStatus, ITeamTask } from "../services/interfaces/ITask"
import { observer } from "mobx-react-lite"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import TaskStatusPopup from "./TaskStatusPopup"
import { typography, useAppTheme } from "../theme"
import { translate } from "../i18n"
import { useTaskStatusValue } from "./StatusType"
import { limitTextCharaters } from "../helpers/sub-text"

interface TaskStatusProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
	iconsOnly?: boolean
	status?: string
	setStatus?: (status: string) => unknown
}

const TaskStatus: FC<TaskStatusProps> = observer(
	({ task, containerStyle, status, setStatus, iconsOnly }) => {
		const { colors, dark } = useAppTheme()
		const { updateTask } = useTeamTasks()
		const [openModal, setOpenModal] = useState(false)

		const allStatuses = useTaskStatusValue()
		const statusItem =
			allStatuses[task ? task?.status?.split("-").join(" ") : status?.split("-").join(" ")]

		const onChangeStatus = async (text) => {
			if (task) {
				const value: ITaskStatus = text
				const taskEdit = {
					...task,
					status: value,
				}

				await updateTask(taskEdit, task.id)
			} else {
				setStatus(text)
			}
		}

		return (
			<>
				<TaskStatusPopup
					statusName={task?.status}
					visible={openModal}
					setSelectedStatus={(e) => onChangeStatus(e)}
					onDismiss={() => setOpenModal(false)}
				/>
				<TouchableOpacity onPress={() => setOpenModal(true)}>
					<View
						style={[
							{
								...styles.container,
								...containerStyle,
								backgroundColor: !dark ? "#F2F2F2" : colors.background,
								borderColor: colors.border,
								borderWidth: 1,
							},
							statusItem ? { backgroundColor: statusItem?.bgColor } : null,
						]}
					>
						{statusItem ? (
							<View style={styles.wrapStatus}>
								{statusItem.icon}
								{iconsOnly ? null : (
									<Text style={{ ...styles.text, marginLeft: 10 }}>
										{limitTextCharaters({ text: statusItem.name, numChars: 11 })}
									</Text>
								)}
							</View>
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
	},
)

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderRadius: 10,
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 30,
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

export default TaskStatus
