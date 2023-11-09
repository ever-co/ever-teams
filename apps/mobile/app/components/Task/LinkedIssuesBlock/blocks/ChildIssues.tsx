/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native"
import React, { useMemo } from "react"
import Accordion from "../../../Accordion"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { useStores } from "../../../../models"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import TaskLinkedIssue from "../components/TaskLinkedIssue"

const ChildIssues = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { teamTasks: tasks } = useTeamTasks()

	const childTasks = useMemo(() => {
		const children = task?.children?.reduce((acc, item) => {
			const $item = tasks.find((ts) => ts.id === item.id) || item
			if ($item) {
				acc.push($item)
			}
			return acc
		}, [] as ITeamTask[])

		return children || []
	}, [task, tasks])

	return (
		<Accordion
			titleFontSize={14}
			arrowSize={20}
			title="Child Issues"
			headerElement={
				<View style={styles.headerElement}>
					<TouchableWithoutFeedback>
						<AntDesign name="plus" size={16} color="#B1AEBC" />
					</TouchableWithoutFeedback>
					<Entypo name="dots-three-horizontal" size={16} color="#B1AEBC" />
					<View style={styles.verticalSeparator} />
				</View>
			}
		>
			{childTasks.map((task) => (
				<TaskLinkedIssue key={task?.id} task={task} />
			))}
		</Accordion>
	)
}

export default ChildIssues

const styles = StyleSheet.create({
	headerElement: { alignItems: "center", flexDirection: "row", gap: 10 },
	verticalSeparator: { borderRightColor: "#B1AEBC", borderRightWidth: 1, height: 20 },
})
