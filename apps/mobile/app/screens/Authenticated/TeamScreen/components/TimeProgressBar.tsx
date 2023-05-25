/* eslint-disable camelcase */
import { observer } from "mobx-react-lite"
import React, { FC, useMemo } from "react"
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
		TimerStore: { timerStatus },
		TaskStore: { activeTask },
	} = useStores()

	const { getTaskStat, activeTaskTotalStat } = useTaskStatistics()
	const { taskTotalStat } = getTaskStat(memberInfo.memberTask)
	const { h, m } = secondsToTime(memberInfo.memberTask?.estimate || 0)

	const progress = useMemo(() => {
		if (!isAuthUser) {
			return (taskTotalStat?.duration * 100) / memberInfo.memberTask?.estimate
		}

		return (activeTaskTotalStat?.duration * 100) / memberInfo.memberTask?.estimate || 0
	}, [timerStatus, activeTask?.id, activeTaskTotalStat])

	return (
		<View style={{}}>
			<TouchableOpacity onPress={() => onPress()}>
				<AnimatedCircularProgress
					size={48}
					width={5}
					fill={progress}
					prefill={0}
					tintColor="#27AE60"
					backgroundColor="#F0F0F0"
				>
					{() => (
						<Text style={{ ...styles.progessText, color: colors.primary }}>
							{h !== 0 ? h + "h" : m !== 0 ? m + "m" : h + "h"}
						</Text>
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
