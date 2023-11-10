/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native"
import React, { useCallback, useMemo, useState } from "react"
import Accordion from "../../../Accordion"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { useStores } from "../../../../models"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import {
	ITeamTask,
	LinkedTaskIssue,
	TaskRelatedIssuesRelationEnum,
} from "../../../../services/interfaces/ITask"
import TaskLinkedIssue from "../components/TaskLinkedIssue"
import CreateLinkedIssueModal from "../components/CreateLinkedIssueModal"
import { useTaskLinkedIssues } from "../../../../services/hooks/features/useTaskLinkedIssue"

const RelatedIssues = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { createTaskLinkedIssue, loading } = useTaskLinkedIssues()

	const { teamTasks: tasks } = useTeamTasks()

	const [modalOpen, setModalOpen] = useState<boolean>(false)

	const linkedTasks = useMemo(() => {
		const issues = task?.linkedIssues?.reduce((acc, item) => {
			const $item = tasks.find((ts) => ts?.id === item?.taskFrom?.id) || item.taskFrom

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

	const onTaskSelect = useCallback(async (childTask: ITeamTask | undefined) => {
		await createTaskLinkedIssue({
			action: TaskRelatedIssuesRelationEnum.RELATES_TO,
			organizationId: task?.organizationId,
			taskFromId: childTask?.id,
			taskToId: task?.id,
		}).finally(() => setModalOpen(false))
	}, [])

	const isTaskEpic = task?.issueType === "Epic"
	const isTaskStory = task?.issueType === "Story"
	const linkedTasksItems = task?.linkedIssues?.map((t) => t?.taskFrom?.id) || []

	const unlinkedTasks = tasks.filter((childTask) => {
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

		return childTask?.id !== task?.id && !linkedTasksItems.includes(childTask?.id) && hasChild()
	})

	return (
		<Accordion
			titleFontSize={14}
			arrowSize={20}
			title="Related Issues"
			headerElement={
				<View style={styles.headerElement}>
					<TouchableWithoutFeedback onPress={() => setModalOpen(true)}>
						<AntDesign name="plus" size={16} color="#B1AEBC" />
					</TouchableWithoutFeedback>
					<Entypo name="dots-three-horizontal" size={16} color="#B1AEBC" />
					<View style={styles.verticalSeparator} />

					{task && (
						<CreateLinkedIssueModal
							isLoading={loading}
							onTaskPress={onTaskSelect}
							taskItems={unlinkedTasks}
							task={task}
							visible={modalOpen}
							onDismiss={() => setModalOpen(false)}
						/>
					)}
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
