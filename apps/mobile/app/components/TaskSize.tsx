/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useAppTheme } from "../app"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { useTaskSizes } from "../services/hooks/features/useTaskSizes"
import { showMessage } from "react-native-flash-message"
import { BadgedTaskSize } from "./SizeIcon"
import { typography } from "../theme"
import TaskSizePopup from "./TaskSizePopup"
import { translate } from "../i18n"

interface TaskSizeProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
}

const TaskSize: FC<TaskSizeProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const { allTaskSizes } = useTaskSizes()
	const [openModal, setOpenModal] = useState(false)

	const currentSize = useMemo(
		() => allTaskSizes.find((s) => s.name === task?.size),
		[task?.size, allTaskSizes],
	)

	const onChangeSize = async (text) => {
		if (task) {
			const taskEdit = {
				...task,
				size: text,
			}

			const { response } = await updateTask(taskEdit, task.id)
			if (response.status !== 202) {
				showMessage({
					message: "Something went wrong",
					type: "danger",
				})
			}
		}
	}

	return (
		<>
			<TaskSizePopup
				sizeName={task?.size}
				visible={openModal}
				setSelectedSize={(e) => onChangeSize(e.name)}
				onDismiss={() => setOpenModal(false)}
			/>
			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View
					style={{
						...styles.container,
						...containerStyle,
						backgroundColor: currentSize?.color,
					}}
				>
					{task && task.size ? (
						<BadgedTaskSize iconSize={14} TextSize={10} status={task.size} />
					) : (
						<Text style={{ ...styles.text, color: colors.primary }}>
							{translate("settingScreen.sizeScreen.sizes")}
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

export default TaskSize
