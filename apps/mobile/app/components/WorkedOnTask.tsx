/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
import { observer } from "mobx-react-lite"
import React from "react"
import { View, StyleSheet, Text, ViewStyle, TextStyle } from "react-native"
import { secondsToTime } from "../helpers/date"
import { pad } from "../helpers/number"
import { useTaskStatistics } from "../services/hooks/features/useTaskStatics"
import { ITeamTask } from "../services/interfaces/ITask"
import { typography } from "../theme/typography"

const WorkedOnTask = observer(
	({
		title,
		containerStyle,
		memberTask,
		totalTimeText,
	}: {
		isAuthUser?: boolean
		title: string
		memberTask: ITeamTask
		containerStyle: ViewStyle
		totalTimeText: TextStyle
		isActiveTask?: boolean
	}) => {
		const { getTaskStat } = useTaskStatistics()
		const { taskTotalStat } = getTaskStat(memberTask)

		const { h: dh, m: dm } = secondsToTime(taskTotalStat?.duration || 0)

		return (
			<View style={containerStyle}>
				<Text style={styles.totalTimeTitle}>{title} : </Text>
				<Text style={totalTimeText}>
					{pad(dh)} h:{pad(dm)} m
				</Text>
			</View>
		)
	},
)

const styles = StyleSheet.create({
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.secondary.medium,
		fontSize: 10,
	},
	totalTimeTxt: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
	},
	wrapTotalTime: {
		flexDirection: "row",
	},
})
export default WorkedOnTask
