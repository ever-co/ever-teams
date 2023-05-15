/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	TextStyle,
	Dimensions,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { typography, useAppTheme } from "../theme"
import TaskLabelPopup from "./TaskLabelPopup"
import { ITaskLabelItem } from "../services/interfaces/ITaskLabel"
import { translate } from "../i18n"
import { useTaskLabelValue } from "./StatusType"
import { limitTextCharaters } from "../helpers/sub-text"

interface TaskLabelProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	labelTextSyle?: TextStyle
}

const TaskLabel: FC<TaskLabelProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const [openModal, setOpenModal] = useState(false)

	const allTaskLabels = useTaskLabelValue()
	const label = task?.tags[0] as ITaskLabelItem

	const currentLabel = allTaskLabels[label?.name.split("-").join(" ")]

	const onChangeLabel = async (text: ITaskLabelItem) => {
		if (task) {
			let tags = []
			const exist = task.tags.find((label) => label.id === text.id)

			if (exist) {
				tags = task.tags.filter((label) => label.id !== text.id)
			} else {
				tags = [...task.tags, text]
			}

			const taskEdit = {
				...task,
				tags,
			}

			await updateTask(taskEdit, task.id)
		}
	}

	return (
		<>
			<TaskLabelPopup
				labelNames={task?.tags}
				visible={openModal}
				setSelectedLabel={(e) => onChangeLabel(e)}
				onDismiss={() => setOpenModal(false)}
			/>
			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View
					style={{
						...styles.container,
						...containerStyle,
						backgroundColor: currentLabel?.bgColor,
					}}
				>
					{task && task.tags[0] && currentLabel ? (
						<View style={styles.wrapStatus}>
							{currentLabel.icon}
							<Text style={{ ...styles.text, marginLeft: 10 }}>
								{limitTextCharaters({ text: currentLabel.name, numChars: 15 })}
							</Text>
						</View>
					) : (
						<Text style={{ ...styles.text, color: colors.primary }}>
							{translate("settingScreen.labelScreen.labels")}
						</Text>
					)}
					<AntDesign name="down" size={14} color={colors.primary} />
				</View>
			</TouchableOpacity>
		</>
	)
})
const { width } = Dimensions.get("window")
const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0, 0, 0, 0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 32,
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 7,
		width: width / 3,
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

export default TaskLabel
