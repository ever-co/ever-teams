/* eslint-disable react-native/no-inline-styles */
import { View, Text } from "react-native"
import React from "react"
import { useStores } from "../../../models"

const TaskTitleBlock = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	return (
		<View>
			<Text style={{ fontSize: 20, fontWeight: "600" }}>{task?.title}</Text>
		</View>
	)
}

export default TaskTitleBlock
