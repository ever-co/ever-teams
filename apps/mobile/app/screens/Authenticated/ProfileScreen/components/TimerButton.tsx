import React, { FC } from "react"
import { LinearGradient } from "expo-linear-gradient"
import { Image, StyleSheet } from "react-native"
import { useStores } from "../../../../models"
import { useTimer } from "../../../../services/hooks/useTimer"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { TouchableOpacity } from "react-native-gesture-handler"
import { useAppTheme } from "../../../../theme"

interface Props {
	isActiveTask: boolean
	isAssignedTask: boolean
	task: ITeamTask
}

const TimerButton: FC<Props> = observer(({ isActiveTask, isAssignedTask, task }) => {
	const { colors, dark } = useAppTheme()
	const {
		TimerStore: { localTimerStatus },
		TaskStore: { setActiveTask },
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
					{ backgroundColor: colors.background, borderColor: colors.border },
				]}
				onPress={() => handleStartTimer()}
			>
				<Image
					resizeMode="contain"
					style={styles.timerIcon}
					source={
						localTimerStatus.running
							? require("../../../../../assets/icons/new/stop-blue.png")
							: require("../../../../../assets/icons/new/play.png")
					}
				/>
			</TouchableOpacity>
		)
	}

	return (
		<LinearGradient colors={["#E93CB9", "#6A71E7"]} style={styles.timerBtn}>
			<TouchableOpacity onPress={() => handleStartTimer()}>
				<Image
					resizeMode="contain"
					style={styles.timerIcon}
					source={
						localTimerStatus.running
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
