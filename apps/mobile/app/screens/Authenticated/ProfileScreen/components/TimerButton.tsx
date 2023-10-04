/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */

import React, { FC } from "react"
import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet } from "react-native"
import { useStores } from "../../../../models"
import { useTimer } from "../../../../services/hooks/useTimer"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { TouchableOpacity } from "react-native-gesture-handler"
import { useAppTheme } from "../../../../theme"
import { SvgXml } from "react-native-svg"
import { timerMediumPlayIcon, timerMediumStopIcon } from "../../../../components/svgs/icons"

interface Props {
	isActiveTask: boolean
	task: ITeamTask
}

const TimerButton: FC<Props> = observer(({ isActiveTask, task }) => {
	const { colors, dark } = useAppTheme()
	const {
		TimerStore: { localTimerStatus },
	} = useStores()
	const { startTimer, stopTimer } = useTimer()
	const { setActiveTeamTask } = useTeamTasks()

	const handleStartTimer = () => {
		if (!localTimerStatus?.running) {
			if (!isActiveTask) {
				setActiveTeamTask(task)
				startTimer()
				return
			}
			startTimer()
			return
		}
		stopTimer()
	}

	if (!dark) {
		return (
			<TouchableOpacity
				style={[
					styles.timerBtn,
					{
						backgroundColor:
							localTimerStatus.running && isActiveTask ? "#e11d48" : colors.background,
						borderColor: localTimerStatus.running && isActiveTask ? "#e11d48" : colors.background,
					},
				]}
				onPress={() => handleStartTimer()}
			>
				{localTimerStatus.running && isActiveTask ? (
					<SvgXml xml={timerMediumStopIcon} />
				) : (
					<SvgXml xml={timerMediumPlayIcon} />
				)}
			</TouchableOpacity>
		)
	}

	return (
		<>
			{localTimerStatus.running && isActiveTask ? (
				<TouchableOpacity
					style={[
						styles.timerBtn,
						{
							backgroundColor: "#e11d48",
							borderColor: "#e11d48",
						},
					]}
					onPress={() => handleStartTimer()}
				>
					<SvgXml xml={timerMediumStopIcon} />
				</TouchableOpacity>
			) : (
				<LinearGradient colors={["#E93CB9", "#6A71E7"]} style={styles.timerBtn}>
					<TouchableOpacity onPress={() => handleStartTimer()}>
						<SvgXml xml={timerMediumPlayIcon} />
					</TouchableOpacity>
				</LinearGradient>
			)}
		</>
	)
})

const styles = StyleSheet.create({
	timerBtn: {
		alignItems: "center",
		borderColor: "rgba(0, 0, 0, 0.4)",
		borderRadius: 20,
		borderWidth: 1,
		elevation: 10,
		height: 42,
		justifyContent: "center",
		marginRight: 10,
		shadowColor: "rgba(0,0,0,0.16)",
		shadowOffset: { width: 5, height: 10 },
		shadowOpacity: 1,
		shadowRadius: 10,
		width: 42,
	},
	timerIcon: {
		height: 21,
		width: 21,
	},
})

export default TimerButton
