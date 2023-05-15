/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../services/interfaces/ITask"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"
import { showMessage } from "react-native-flash-message"
import { typography, useAppTheme } from "../theme"
import TaskSizePopup from "./TaskSizePopup"
import { translate } from "../i18n"
import { limitTextCharaters } from "../helpers/sub-text"
import { useTaskSizeValue } from "./StatusType"

interface TaskSizeProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
}

const TaskSize: FC<TaskSizeProps> = observer(({ task, containerStyle }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	// const { allTaskSizes } = useTaskSizes()
	const [openModal, setOpenModal] = useState(false)

	const allTaskSizes = useTaskSizeValue()
	const currentSize = allTaskSizes[task?.size?.split("-").join(" ")]

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
						backgroundColor: currentSize?.bgColor,
					}}
				>
					{task && task.size && currentSize ? (
						<View style={styles.wrapStatus}>
							{currentSize.icon}
							<Text style={{ ...styles.text, marginLeft: 10 }}>
								{limitTextCharaters({ text: currentSize.name, numChars: 15 })}
							</Text>
						</View>
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
	wrapStatus: {
		alignItems: "center",
		flexDirection: "row",
		width: "70%",
	},
})

export default TaskSize
