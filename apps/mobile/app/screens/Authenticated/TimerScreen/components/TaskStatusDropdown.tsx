import React, { FC } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { ITeamTask } from "../../../../services/interfaces/ITask"

// COMPONENTS
import { Text } from "../../../../components"
import { observer } from "mobx-react-lite"

// STYLES
import { typography, useAppTheme } from "../../../../theme"
import TaskStatusList from "./TaskStatusList"

export interface Props {
	task: ITeamTask
}

const TaskStatusDropdown: FC<Props> = observer(({ task }) => {
	const { colors } = useAppTheme()

	const [isOpened, setIsOpened] = React.useState(false)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<TouchableOpacity
				onPress={() => setIsOpened(!isOpened)}
				style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Text
						style={[
							styles.dropdownItemTxt,
							{
								fontSize: 10,
								color: colors.primary,
							},
						]}
					>
						{task ? task.status : "Status"}
					</Text>
				</View>

				{isOpened ? (
					<AntDesign name="up" size={18} color={colors.primary} />
				) : (
					<AntDesign name="down" size={18} color={colors.primary} />
				)}
			</TouchableOpacity>
			{isOpened && <TaskStatusList onDismiss={() => setIsOpened(false)} />}
		</View>
	)
})

export default TaskStatusDropdown

const styles = StyleSheet.create({
	container: {
		borderRadius: 10,
		height: "100%",
		justifyContent: "center",
		paddingHorizontal: 12,
		width: "100%",
		zIndex: 999,
	},
	dropdownItemTxt: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
	},
})
