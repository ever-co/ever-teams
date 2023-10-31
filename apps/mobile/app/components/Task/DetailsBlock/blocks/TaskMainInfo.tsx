/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text, StyleSheet } from "react-native"
import React from "react"
import { useStores } from "../../../../models"
import TaskRow from "../components/TaskRow"
import { SvgXml } from "react-native-svg"
import { clipboardIcon, peopleIconSmall, profileIcon } from "../../../svgs/icons"
import ProfileInfo from "../components/ProfileInfo"
import ManageAssignees from "../components/ManageAssignees"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"

const TaskMainInfo = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { currentTeam } = useOrganizationTeam()

	return (
		<View style={{ paddingHorizontal: 12, gap: 12 }}>
			{/* Issue type */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={clipboardIcon} />
						<Text style={{ color: "#A5A2B2" }}>Type of Issue</Text>
					</View>
				}
			>
				<Text>Issue Modal here</Text>
			</TaskRow>
			{/* Creator */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={profileIcon} />
						<Text style={{ color: "#A5A2B2" }}>Creator</Text>
					</View>
				}
			>
				<ProfileInfo
					userId={task?.creatorId || task?.creator?.id}
					profilePicSrc={task?.creator?.imageUrl}
					names={`${task?.creator?.firstName || ""} ${task?.creator?.lastName || ""}`}
				/>
			</TaskRow>
			{/* Assignees */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={peopleIconSmall} />
						<Text style={{ color: "#A5A2B2" }}>Assignees</Text>
					</View>
				}
			>
				{task?.members?.map((member, index) => (
					<ProfileInfo
						key={index}
						userId={member?.userId || member?.user?.id}
						profilePicSrc={member?.user?.imageUrl}
						names={`${member?.user?.firstName || ""} ${member?.user?.lastName || ""}`}
					/>
				))}

				{/* Manage Assignees */}
				<ManageAssignees memberList={currentTeam?.members} task={task} />
			</TaskRow>
		</View>
	)
}

export default TaskMainInfo

const styles = StyleSheet.create({
	labelComponent: {
		alignItems: "center",
		flexDirection: "row",
		gap: 7,
	},
})
