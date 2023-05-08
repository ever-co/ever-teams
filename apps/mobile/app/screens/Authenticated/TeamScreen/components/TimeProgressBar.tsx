/* eslint-disable camelcase */
import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { secondsToTime } from "../../../../helpers/date"
import { useStores } from "../../../../models"
import { useTaskStatistics } from "../../../../services/hooks/features/useTaskStatics"
import { I_TeamMemberCardHook } from "../../../../services/hooks/features/useTeamMemberCard"
import { useAppTheme } from "../../../../theme"
import { typography } from "../../../../theme/typography"

interface IProps {
	isAuthUser: boolean
	memberInfo: I_TeamMemberCardHook
	onPress: () => unknown
}

export const TimeProgressBar: FC<IProps> = observer(({ memberInfo, isAuthUser, onPress }) => {
	// Get current timer seconds
	const { colors } = useAppTheme()

	const {
		TimerStore: { timeCounterState },
	} = useStores()

	const { getTaskStat } = useTaskStatistics()
	const { taskTotalStat } = getTaskStat(memberInfo.memberTask)
	const { h: estimatedHours } = secondsToTime(memberInfo.memberTask.estimate || 0)

	const [progress, setProgress] = useState(0)

	const getProgress = () => {
		if (!isAuthUser) {
			setProgress((taskTotalStat?.duration * 100) / memberInfo.memberTask.estimate)
		}
		const counterInSeconds = timeCounterState / 1000
		const sum = taskTotalStat?.duration + counterInSeconds

		setProgress((sum * 100) / memberInfo.memberTask.estimate)
	}

	useEffect(() => {
		getProgress()
	}, [timeCounterState, taskTotalStat?.duration])

	return (
		<View style={{}}>
			<TouchableOpacity onPress={() => onPress()}>
				<AnimatedCircularProgress
					size={48}
					width={5}
					fill={progress}
					tintColor="#27AE60"
					backgroundColor="#F0F0F0"
				>
					{() => (
						<Text style={{ ...styles.progessText, color: colors.primary }}>{estimatedHours}H</Text>
					)}
				</AnimatedCircularProgress>
			</TouchableOpacity>
		</View>
	)
})

const styles = StyleSheet.create({
	progessText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 10,
	},
})
