/* eslint-disable react-native/no-color-literals */
/* eslint-disable camelcase */
import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, Text, StyleSheet } from "react-native"
import { secondsToTime } from "../../../../helpers/date"
import { pad } from "../../../../helpers/number"
import { translate } from "../../../../i18n"
import { useStores } from "../../../../models"
import { useTaskStatistics } from "../../../../services/hooks/features/useTaskStatics"
import { I_TeamMemberCardHook } from "../../../../services/hooks/features/useTeamMemberCard"
import { typography } from "../../../../theme/typography"

interface IProps {
	isAuthUser: boolean
	memberInfo: I_TeamMemberCardHook
}

export const TotalWork: FC<IProps> = observer(({ memberInfo, isAuthUser }) => {
	// Get current timer seconds
	const {
		TimerStore: { timeCounterState },
	} = useStores()

	const { getTaskStat } = useTaskStatistics()
	const { taskTotalStat } = getTaskStat(memberInfo?.memberTask)

	const { h: th, m: tm } = secondsToTime(
		taskTotalStat?.duration + (isAuthUser ? timeCounterState / 1000 : 0),
	)

	return (
		<View style={styles.container}>
			<Text style={styles.totalTimeTitle}>{translate("teamScreen.cardTotalWorkLabel")}</Text>
			<Text style={styles.totalTimeText}>
				{pad(th)} h:{pad(tm)} m
			</Text>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		height: "80%",
		justifyContent: "space-between",
	},
	totalTimeText: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
	},
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.secondary.medium,
		fontSize: 10,
	},
})
