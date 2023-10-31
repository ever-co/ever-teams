/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text, StyleSheet } from "react-native"
import React from "react"
import { useStores } from "../../../../models"
import TaskRow from "../components/TaskRow"
import { SvgXml } from "react-native-svg"
import { calendarIcon, clipboardIcon, peopleIconSmall, profileIcon } from "../../../svgs/icons"
import ProfileInfo from "../components/ProfileInfo"
import ManageAssignees from "../components/ManageAssignees"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import CalendarModal from "../components/CalendarModal"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import moment from "moment-timezone"
import TaskStatus from "../../../TaskStatus"
import TaskSize from "../../../TaskSize"
import TaskPriority from "../../../TaskPriority"
import TaskLabels from "../../../TaskLabels"

const TaskMainInfo = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { currentTeam } = useOrganizationTeam()
	const { updateTask } = useTeamTasks()

	return (
		<View style={{ paddingHorizontal: 12, gap: 12, paddingBottom: 12 }}>
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

			{/* Manage Start Date */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={calendarIcon} />
						<Text style={{ color: "#A5A2B2" }}>Start Date</Text>
					</View>
				}
			>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, startDate: date }, task?.id)}
					selectedDate={task?.startDate}
				/>
			</TaskRow>

			{/* Manage Due Date */}
			<TaskRow
				labelComponent={
					<View style={[styles.labelComponent, { marginLeft: 19 }]}>
						<Text style={{ color: "#A5A2B2" }}>Due Date</Text>
					</View>
				}
			>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, dueDate: date }, task?.id)}
					selectedDate={task?.dueDate}
					isDueDate={true}
				/>
			</TaskRow>

			{/* Days Remaining */}
			{task?.startDate && task?.dueDate && (
				<TaskRow
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 19 }]}>
							<Text style={{ color: "#A5A2B2" }}>Days Remaining</Text>
						</View>
					}
				>
					<Text style={{ fontWeight: "600", fontSize: 12 }}>
						{moment(task?.dueDate).diff(moment(), "days") < 0
							? 0
							: moment(task?.dueDate).diff(moment(), "days")}
					</Text>
				</TaskRow>
			)}

			{/* horizontal separator */}
			<View
				style={{
					borderBottomWidth: 1,
					width: "100%",
					borderBottomColor: "#F2F2F2",
					marginVertical: 10,
				}}
			/>

			{/* Version TODO */}
			{/* Epic TODO */}

			{/* Status */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={{ color: "#A5A2B2" }}>Status</Text>
					</View>
				}
			>
				<TaskStatus
					task={task}
					containerStyle={{
						// ...styles.sizeContainer,
						// borderColor: colors.border,
						width: "70%",
						borderRadius: 3,
					}}
				/>
			</TaskRow>

			{/* Labels */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={{ color: "#A5A2B2" }}>Labels</Text>
					</View>
				}
			>
				<TaskLabels
					task={task}
					containerStyle={{
						// ...styles.sizeContainer,
						// borderColor: colors.border,
						width: "70%",
						borderRadius: 3,
					}}
				/>
			</TaskRow>

			{/* Size */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={{ color: "#A5A2B2" }}>Size</Text>
					</View>
				}
			>
				<TaskSize
					task={task}
					containerStyle={{
						// ...styles.sizeContainer,
						// borderColor: colors.border,
						width: "70%",
						borderRadius: 3,
					}}
				/>
			</TaskRow>

			{/* Priority */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={{ color: "#A5A2B2" }}>Priority</Text>
					</View>
				}
			>
				<TaskPriority
					task={task}
					containerStyle={{
						// ...styles.sizeContainer,
						// borderColor: colors.border,
						width: "70%",
						borderRadius: 3,
					}}
				/>
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
