/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { Text, TouchableOpacity, View } from "react-native"
import React from "react"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import IssuesModal from "../../../IssuesModal"
import TaskStatus from "../../../TaskStatus"

interface ITaskLinkedIssue {
	task: ITeamTask
}

const TaskLinkedIssue: React.FC<ITaskLinkedIssue> = ({ task }) => {
	return (
		<View
			style={{ paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between" }}
		>
			<TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }}>
				<IssuesModal readonly={true} task={task} relatedIssueIconDimension={true} />
				<Text style={{ fontSize: 8, fontWeight: "600", color: "#BAB8C4", marginLeft: 6 }}>
					#{task?.number}-
				</Text>
				<Text style={{ fontSize: 10, fontWeight: "600" }}>{task?.title}</Text>
			</TouchableOpacity>
			<TaskStatus
				labelOnly={true}
				task={task}
				containerStyle={{
					width: 80,
					borderRadius: 3,
					minHeight: 20,
					borderWidth: !task?.status ? 1 : 0,
				}}
			/>
		</View>
	)
}

export default TaskLinkedIssue
