/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { typography, useAppTheme } from "../theme"
import { translate } from "../i18n"
import { useTaskVersionValue } from "./StatusType"
import { limitTextCharaters } from "../helpers/sub-text"
import TaskVersionPopup from "./TaskVersionPopup"

interface TaskVersionProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	version?: string
	setVersion?: (priority: string) => unknown
}

const TaskVersion: FC<TaskVersionProps> = observer(
	({ task, containerStyle, version, setVersion }) => {
		const { colors } = useAppTheme()
		const { updateTask } = useTeamTasks()
		const [openModal, setOpenModal] = useState(false)

		const allTaskVersions = useTaskVersionValue()

		const versionValue = (task?.version || (version && version))?.toLowerCase()

		const currentVersion =
			allTaskVersions &&
			Object.values(allTaskVersions).find((item) => item.value.toLowerCase() === versionValue)

		const onChangeVersion = async (text: string) => {
			if (task) {
				const taskEdit = {
					...task,
					version: task?.version === text ? null : text,
				}

				await updateTask(taskEdit, task.id)
			} else {
				setVersion(text)
			}
		}

		return (
			<>
				<TaskVersionPopup
					versionName={task ? task?.version : version}
					visible={openModal}
					setSelectedVersion={(e) => onChangeVersion(e.value)}
					onDismiss={() => setOpenModal(false)}
				/>
				<TouchableOpacity onPress={() => setOpenModal(true)}>
					<View
						style={{
							...styles.container,
							...containerStyle,
							borderColor: colors.border,
							backgroundColor: colors.background,
						}}
					>
						{(task?.version || version) && currentVersion ? (
							<View style={styles.wrapStatus}>
								{currentVersion.icon}
								<Text
									style={{
										...styles.text,
										marginLeft: 10,
										color: colors.primary,
									}}
								>
									{limitTextCharaters({
										text: currentVersion.name,
										numChars: 15,
									})}
								</Text>
							</View>
						) : (
							<View style={styles.wrapStatus}>
								<Entypo name="circle" size={12} color={colors.primary} />
								<Text
									style={{ ...styles.text, color: colors.primary, marginLeft: 5 }}
								>
									{translate("taskDetailsScreen.version")}
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
		textTransform: "capitalize",
	},
	wrapStatus: {
		alignItems: "center",
		flexDirection: "row",
		width: "70%",
	},
})

export default TaskVersion
