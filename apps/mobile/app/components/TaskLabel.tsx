/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo, useState } from "react"
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
import { useTaskLabels } from "../services/hooks/features/useTaskLabels"
import { BadgedTaskLabel } from "./LabelIcon"
import TaskLabelPopup from "./TaskLabelPopup"
import { ITaskLabelItem } from "../services/interfaces/ITaskLabel"
import { translate } from "../i18n"

interface TaskLabelProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	labelTextSyle?: TextStyle
}

const TaskLabel: FC<TaskLabelProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const { allTaskLabels } = useTaskLabels()
	const [openModal, setOpenModal] = useState(false)

	const currentLabel = useMemo(
		() => allTaskLabels.find((s) => s?.name === task?.tags[0]?.name),
		[task?.tags[0], allTaskLabels],
	)

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
						backgroundColor: currentLabel?.color,
					}}
				>
					{task && task.tags[0] ? (
						<BadgedTaskLabel iconSize={14} TextSize={10} label={task.tags[0]} />
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
})

export default TaskLabel
