/* eslint-disable react-native/no-color-literals */
import React, { FC, useMemo } from "react"
import { LinearGradient } from "expo-linear-gradient"
import { Image, StyleSheet, View } from "react-native"
import { useStores } from "../../../../models"
import { useTimer } from "../../../../services/hooks/useTimer"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { TouchableOpacity } from "react-native-gesture-handler"
import { useAppTheme } from "../../../../theme"

interface Props {
	isActiveTask: boolean
	task: ITeamTask
	isTrackingEnabled: boolean
}

const TimerButton: FC<Props> = observer(({ isActiveTask, task, isTrackingEnabled }) => {
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

	const key = useMemo(() => `${isTrackingEnabled}`, [isTrackingEnabled])

	if (!dark) {
		return (
			<TouchableOpacity
				key={key}
				style={[
					styles.timerBtn,
					{
						backgroundColor: colors.background,
						borderColor: colors.border,
						opacity: isTrackingEnabled ? 1 : 0.2,
					},
				]}
				disabled={!isTrackingEnabled}
				onPress={() => handleStartTimer()}
			>
				<Image
					resizeMode="contain"
					style={styles.timerIcon}
					source={
						localTimerStatus.running && isActiveTask
							? require("../../../../../assets/icons/new/stop-blue.png")
							: require("../../../../../assets/icons/new/play.png")
					}
				/>
			</TouchableOpacity>
		)
	}

	return (
		<LinearGradient
			colors={["#E93CB9", "#6A71E7"]}
			style={[styles.timerBtn, { opacity: isTrackingEnabled ? 1 : 0.2 }]}
		>
			<TouchableOpacity onPress={() => handleStartTimer()} disabled={!isTrackingEnabled}>
				<Image
					resizeMode="contain"
					style={styles.timerIcon}
					source={
						localTimerStatus.running && isActiveTask
							? require("../../../../../assets/icons/new/stop.png")
							: require("../../../../../assets/icons/new/play-dark.png")
					}
				/>
			</TouchableOpacity>
		</LinearGradient>
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
