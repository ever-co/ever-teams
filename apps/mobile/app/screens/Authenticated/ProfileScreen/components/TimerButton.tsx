/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */

import React, { FC } from "react"
import { StyleSheet } from "react-native"
import { useStores } from "../../../../models"
import { useTimer } from "../../../../services/hooks/useTimer"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { TouchableOpacity } from "react-native-gesture-handler"
import { useAppTheme } from "../../../../theme"
import { SvgXml } from "react-native-svg"
import {
	timerMediumDarkPlayIcon,
	timerMediumPlayIcon,
	timerMediumStopIcon,
} from "../../../../components/svgs/icons"

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

	return (
		<>
			{localTimerStatus.running && isActiveTask ? (
				<TouchableOpacity
					style={[
						styles.timerBtn,
						!dark && styles.shadowTimerRunning,
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
				<TouchableOpacity
					style={[
						styles.timerBtn,
						!dark && styles.shadowTimerNotRunning,
						{
							backgroundColor: dark ? "#1e2430" : colors.background,
							borderColor: dark ? "#1e2430" : colors.background,
						},
					]}
					onPress={() => handleStartTimer()}
				>
					{dark ? <SvgXml xml={timerMediumDarkPlayIcon} /> : <SvgXml xml={timerMediumPlayIcon} />}
				</TouchableOpacity>
			)}
		</>
	)
})

const styles = StyleSheet.create({
	shadowTimerNotRunning: {
		elevation: 10,
		shadowColor: "#3826A6",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
	},
	shadowTimerRunning: {
		elevation: 10,
		shadowColor: "#e11d48",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
	},
	timerBtn: {
		alignItems: "center",
		borderColor: "rgba(0, 0, 0, 0.4)",
		borderRadius: 20,
		borderWidth: 1,
		height: 42,
		justifyContent: "center",
		marginRight: 10,
		width: 42,
	},
	timerIcon: {
		height: 21,
		width: 21,
	},
})

export default TimerButton
