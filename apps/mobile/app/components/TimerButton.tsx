/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
// import { LinearGradient } from "expo-linear-gradient"
import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, StyleSheet, ViewStyle, ImageStyle, Pressable } from "react-native"

import { useStores } from "../models"
import { useTimer } from "../services/hooks/useTimer"
import { ITeamTask } from "../services/interfaces/ITask"
import { useAppTheme } from "../theme"
import { SvgXml } from "react-native-svg"
import { timerLargePlayIcon, timerLargeStopIcon } from "./svgs/icons"
import { LinearGradient } from "expo-linear-gradient"

type TimerButtonProps = {
	task?: ITeamTask
	containerStyle?: ViewStyle
	iconStyle?: ImageStyle
}

const TimerButton: FC<TimerButtonProps> = observer(({ containerStyle }) => {
	const {
		TimerStore: { localTimerStatus },
	} = useStores()
	const { canRunTimer, startTimer, stopTimer } = useTimer()
	const { dark } = useAppTheme()

	if (dark) {
		return (
			<View>
				{!localTimerStatus.running ? (
					<>
						<LinearGradient
							colors={["#E93CB9", "#6A71E7"]}
							style={[styles.timerBtnDarkTheme, containerStyle, { opacity: canRunTimer ? 1 : 0.4 }]}
						>
							<Pressable disabled={!canRunTimer} onPress={() => startTimer()}>
								<SvgXml xml={timerLargePlayIcon} />
							</Pressable>
						</LinearGradient>
					</>
				) : (
					<Pressable
						onPress={() => stopTimer()}
						style={[styles.timerBtnDarkTheme, { backgroundColor: "#e11d48" }, containerStyle]}
					>
						<SvgXml xml={timerLargeStopIcon} />
					</Pressable>
				)}
			</View>
		)
	}

	return (
		<View>
			{!localTimerStatus.running ? (
				<>
					<Pressable
						style={[
							styles.timerBtnInactive,
							containerStyle,
							{ backgroundColor: "#fff", opacity: canRunTimer ? 1 : 0.4 },
						]}
						disabled={!canRunTimer}
						onPress={() => (canRunTimer ? startTimer() : {})}
					>
						<SvgXml xml={timerLargePlayIcon} />
					</Pressable>
				</>
			) : (
				<Pressable
					onPress={() => stopTimer()}
					style={[styles.timerBtnActive, { backgroundColor: "#e11d48" }, containerStyle]}
				>
					<SvgXml xml={timerLargeStopIcon} />
				</Pressable>
			)}
		</View>
	)
})

export default TimerButton

const styles = StyleSheet.create({
	timerBtnActive: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: "center",
		marginHorizontal: 15,
		shadowColor: "#e11d48",
		shadowOffset: {
			width: 0,
			height: 17,
		},
		shadowOpacity: 0.3,
		shadowRadius: 12,
		width: 60,
	},
	timerBtnDarkTheme: {
		alignItems: "center",
		// backgroundColor: "#3826A6",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: "center",
		marginHorizontal: 15,
		width: 60,
	},
	timerBtnInactive: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: "center",
		marginHorizontal: 15,
		shadowColor: "#3826A6",
		shadowOffset: {
			width: 0,
			height: 17,
		},
		shadowOpacity: 0.3,
		shadowRadius: 12,
		width: 60,
	},
	timerIcon: {
		height: 24,
		width: 24,
	},
})
