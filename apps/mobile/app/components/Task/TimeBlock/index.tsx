/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { StyleSheet, Text, View } from "react-native"
import React, { useCallback, useEffect, useState } from "react"
import Accordion from "../../Accordion"
import { useStores } from "../../../models"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import useAuthenticateUser from "../../../services/hooks/features/useAuthentificateUser"
import { OT_Member } from "../../../services/interfaces/IOrganizationTeam"
import { secondsToTime } from "../../../helpers/date"
import { ITasksTimesheet } from "../../../services/interfaces/ITimer"
import TaskRow from "../DetailsBlock/components/TaskRow"
import { ProgressBar } from "react-native-paper"
import { ITeamTask } from "../../../services/interfaces/ITask"
import { useAppTheme } from "../../../theme"

export interface ITime {
	hours: number
	minutes: number
}

const TimeBlock = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()
	const { currentTeam: activeTeam } = useOrganizationTeam()
	const { user } = useAuthenticateUser()
	const { colors } = useAppTheme()

	const [userTotalTime, setUserTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0,
	})
	const [userTotalTimeToday, setUserTotalTimeToday] = useState<ITime>({
		hours: 0,
		minutes: 0,
	})
	const [timeRemaining, setTimeRemaining] = useState<ITime>({
		hours: 0,
		minutes: 0,
	})
	const [groupTotalTime, setGroupTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0,
	})

	const members = activeTeam?.members || []

	const currentUser: OT_Member | undefined = members.find((m) => {
		return m.employee.user?.id === user?.id
	})

	const userTotalTimeOnTask = useCallback((): void => {
		const totalOnTaskInSeconds: number =
			currentUser?.totalWorkedTasks?.find((object) => object.id === task?.id)?.duration || 0

		const { h, m } = secondsToTime(totalOnTaskInSeconds)

		setUserTotalTime({ hours: h, minutes: m })
	}, [currentUser?.totalWorkedTasks, task?.id])

	useEffect(() => {
		userTotalTimeOnTask()
	}, [userTotalTimeOnTask])

	useEffect(() => {
		const matchingMembers: OT_Member[] | undefined = activeTeam?.members.filter((member) =>
			task?.members.some((taskMember) => taskMember.id === member.employeeId),
		)

		const usersTaskArray: ITasksTimesheet[] | undefined = matchingMembers
			?.flatMap((obj) => obj.totalWorkedTasks)
			.filter((taskObj) => taskObj?.id === task?.id)

		const usersTotalTimeInSeconds: number | undefined = usersTaskArray?.reduce(
			(totalDuration, item) => totalDuration + item.duration,
			0,
		)

		const usersTotalTime: number =
			usersTotalTimeInSeconds === null || usersTotalTimeInSeconds === undefined
				? 0
				: usersTotalTimeInSeconds

		const timeObj = secondsToTime(usersTotalTime)
		const { h: hoursTotal, m: minutesTotal } = timeObj
		setGroupTotalTime({ hours: hoursTotal, minutes: minutesTotal })

		const remainingTime: number =
			task?.estimate === null ||
			task?.estimate === 0 ||
			task?.estimate === undefined ||
			usersTotalTimeInSeconds === undefined
				? 0
				: task?.estimate - usersTotalTimeInSeconds

		const { h, m } = secondsToTime(remainingTime)
		setTimeRemaining({ hours: h, minutes: m })
		if (remainingTime <= 0) {
			setTimeRemaining({ hours: 0, minutes: 0 })
		}
	}, [task?.members, task?.id, task?.estimate])

	const getTimePercentage = () => {
		if (task) {
			if (!task.estimate) {
				return 0
			}

			let taskTotalDuration = 0
			activeTeam?.members?.forEach((member) => {
				const totalWorkedTasks =
					member?.totalWorkedTasks?.find((item) => item.id === task?.id) || null

				if (totalWorkedTasks) {
					taskTotalDuration += totalWorkedTasks.duration
				}
			})

			return taskTotalDuration ? taskTotalDuration / task?.estimate : 0
		} else {
			return 0
		}
	}

	return (
		<Accordion title="Time">
			<View style={{ paddingBottom: 12, gap: 12 }}>
				{/* Progress Bar */}
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>Progress</Text>
						</View>
					}
				>
					<Progress task={task} percent={getTimePercentage} />
				</TaskRow>
				{/* Total Time */}
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>Total Time</Text>
						</View>
					}
				>
					<Text style={[styles.timeValues, { color: colors.primary }]}>
						{userTotalTime.hours}h : {userTotalTime.minutes}m
					</Text>
				</TaskRow>
				{/* Total Time Today */}
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>Time Today</Text>
						</View>
					}
				>
					<Text style={[styles.timeValues, { color: colors.primary }]}>
						{userTotalTimeToday.hours}h : {userTotalTimeToday.minutes}m
					</Text>
				</TaskRow>
				{/* Total Group Time */}
				{/* TODO */}
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>Total Group Time</Text>
						</View>
					}
				>
					<Text style={[styles.timeValues, { color: colors.primary }]}>
						{groupTotalTime.hours}h : {groupTotalTime.minutes}m
					</Text>
				</TaskRow>
				{/* Time Remaining */}
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 12 }]}>
							<Text style={styles.labelText}>Time Remaining</Text>
						</View>
					}
				>
					<Text style={[styles.timeValues, { color: colors.primary }]}>
						{timeRemaining.hours}h : {timeRemaining.minutes}m
					</Text>
				</TaskRow>
			</View>
		</Accordion>
	)
}

export default TimeBlock

interface IProgress {
	task: ITeamTask
	percent: () => number
}

const Progress: React.FC<IProgress> = ({ task, percent }) => {
	return (
		<View
			style={{
				paddingRight: 12,
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<View style={{ width: "79%" }}>
				<ProgressBar
					style={styles.progressBar}
					progress={percent()}
					color={task && task.estimate > 0 ? "#27AE60" : "#F0F0F0"}
				/>
			</View>
			<Text style={{ fontSize: 12, color: "#28204880" }}>{Math.floor(percent() * 100)}%</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	labelComponent: {
		alignItems: "center",
		flexDirection: "row",
		gap: 7,
	},
	labelText: {
		color: "#A5A2B2",
		fontSize: 12,
	},
	progressBar: { backgroundColor: "#E9EBF8", borderRadius: 3, height: 6, width: "100%" },
	timeValues: { fontSize: 12, fontWeight: "500" },
})
