import React, { FC } from "react"
import { View } from "react-native"
import { ProgressBar, Text } from "react-native-paper"
import EStyleSheet from "react-native-extended-stylesheet"

import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { pad } from "../helpers/number"
import { typography } from "../theme"
import { useTimer } from "../services/hooks/useTimer"
import { useAppTheme } from "../app"
import TimerButton from "./TimerButton"

export interface Props {}

const TimerCard: FC<Props> = observer(() => {
	const { colors } = useAppTheme()
	const {
		TaskStore: { activeTask },
		TimerStore: { timeCounterState },
	} = useStores()

	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
	} = useTimer()

	const getTimePercentage = () => {
		if (activeTask) {
			if (!activeTask.estimate) {
				return 0
			}
			// convert milliseconds to seconds
			const seconds = timeCounterState / 1000
			return seconds / activeTask.estimate
		} else {
			return 0
		}
	}

	return (
		<View style={[styles.mainContainer, { borderTopColor: colors.border }]}>
			<View style={styles.horizontal}>
				<View style={{ justifyContent: "space-around", width: "61%" }}>
					<Text style={[styles.timerText, { color: colors.primary }]}>
						{pad(hours)}:{pad(minutes)}:{pad(seconds)}
						<Text style={{ fontSize: 14 }}>:{pad(ms_p)}</Text>
					</Text>
					<ProgressBar
						style={{ backgroundColor: "#E9EBF8", width: "84%", height: 6, borderRadius: 3 }}
						progress={getTimePercentage()}
						color={activeTask && activeTask.estimate > 0 ? "#27AE60" : "#F0F0F0"}
					/>
				</View>
				<View style={[styles.timerBtn, { borderLeftColor: colors.border }]}>
					<TimerButton />
				</View>
			</View>
		</View>
	)
})

const styles = EStyleSheet.create({
	mainContainer: {
		width: "100%",
		borderTopColor: "rgba(0, 0, 0, 0.06)",
		borderTopWidth: 1,
		paddingTop: 24,
		zIndex: 998,
	},
	timerBtn: {
		marginVertical: 4,
		justifyContent: "center",
		alignItems: "center",
		width: "39%",
		borderLeftWidth: 2,
		borderLeftColor: "rgba(0, 0, 0, 0.08)",
	},
	horizontal: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		height: 60,
	},
	loading: {
		position: "absolute",
		right: 10,
		top: 15,
	},
	timerText: {
		fontWeight: "600",
		fontSize: "2rem",
		color: "#1B005D",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
	},
})

export default TimerCard
