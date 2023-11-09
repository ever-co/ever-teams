/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native"
import React, { useCallback, useMemo, useState } from "react"
import Accordion from "../../../Accordion"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { useStores } from "../../../../models"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import TaskLinkedIssue from "../components/TaskLinkedIssue"
import CreateLinkedIssueModal from "../components/CreateLinkedIssueModal"

const ChildIssues = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()
	const { teamTasks: tasks } = useTeamTasks()

	const [modalOpen, setModalOpen] = useState<boolean>(false)

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

	const onTaskSelect = useCallback((childTask: ITeamTask | undefined) => {
		console.log(childTask)
		setModalOpen(false)
	}, [])

	const isTaskEpic = task?.issueType === "Epic"
	const isTaskStory = task?.issueType === "Story"
	const childrenTasks = task?.children?.map((t) => t.id) || []

	const unchildTasks = tasks.filter((childTask) => {
		const hasChild = () => {
			if (isTaskEpic) {
				return childTask.issueType !== "Epic"
			} else if (isTaskStory) {
				return childTask.issueType !== "Epic" && childTask.issueType !== "Story"
			} else {
				return (
					childTask.issueType === "Bug" ||
					childTask.issueType === "Task" ||
					childTask.issueType === null
				)
			}
		}

		return childTask.id !== task.id && !childrenTasks.includes(childTask.id) && hasChild()
	})

	return (
		<Accordion
			titleFontSize={14}
			arrowSize={20}
			title="Child Issues"
			headerElement={
				<View style={styles.headerElement}>
					<TouchableWithoutFeedback onPress={() => setModalOpen(true)}>
						<AntDesign name="plus" size={16} color="#B1AEBC" />
					</TouchableWithoutFeedback>
					<Entypo name="dots-three-horizontal" size={16} color="#B1AEBC" />
					<View style={styles.verticalSeparator} />

					{task && (
						<CreateLinkedIssueModal
							onTaskPress={onTaskSelect}
							taskItems={unchildTasks}
							task={task}
							visible={modalOpen}
							onDismiss={() => setModalOpen(false)}
						/>
					)}
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
