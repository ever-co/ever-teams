/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native"
import React, { useMemo } from "react"
import Accordion from "../../../Accordion"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { useStores } from "../../../../models"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ITeamTask, LinkedTaskIssue } from "../../../../services/interfaces/ITask"
import TaskLinkedIssue from "../components/TaskLinkedIssue"

const RelatedIssues = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { teamTasks: tasks } = useTeamTasks()

	const linkedTasks = useMemo(() => {
		const issues = task?.linkedIssues?.reduce((acc, item) => {
			const $item = tasks.find((ts) => ts.id === item.taskFrom.id) || item.taskFrom

			if ($item /* && item.action === actionType?.data?.value */) {
				acc.push({
					issue: item,
					task: $item,
				})
			}

			return acc
		}, [] as { issue: LinkedTaskIssue; task: ITeamTask }[])

		return issues || []
	}, [task, tasks])

	return (
		<Accordion
			titleFontSize={14}
			arrowSize={20}
			title="Related Issues"
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
			{linkedTasks.map(({ task, issue }) => (
				<TaskLinkedIssue key={task?.id} task={task} issue={issue} relatedTaskModal={true} />
			))}
		</Accordion>
	)
}

export default RelatedIssues

const styles = StyleSheet.create({
	headerElement: { alignItems: "center", flexDirection: "row", gap: 10 },
	verticalSeparator: { borderRightColor: "#B1AEBC", borderRightWidth: 1, height: 20 },
})
