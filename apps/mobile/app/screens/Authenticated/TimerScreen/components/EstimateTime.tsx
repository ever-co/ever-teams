import React, { FC, useCallback, useEffect, useState } from "react"
import { View, StyleSheet, TextInput } from "react-native"
import { Text, ActivityIndicator } from "react-native-paper"
import { Feather } from "@expo/vector-icons"
import { secondsToTime } from "../../../../helpers/date"
import { typography, useAppTheme } from "../../../../theme"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { ITeamTask } from "../../../../services/interfaces/ITask"

interface Props {
	setEditEstimate?: (value: boolean) => unknown
	currentTask: ITeamTask
}
const EstimateTime: FC<Props> = ({ setEditEstimate, currentTask }) => {
	// Hooks
	const { updateTask } = useTeamTasks()
	const { colors } = useAppTheme()

	// STATES
	const [estimate, setEstimate] = useState({ hours: "", minutes: "" })
	const [editing, setEditing] = useState({ editingHour: false, editingMinutes: false })
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)

	useEffect(() => {
		const { h, m } = secondsToTime(currentTask?.estimate || 0)
		setEstimate({
			hours: h.toString(),
			minutes: m.toString(),
		})
		setShowCheckIcon(false)
	}, [currentTask])

	const onChangeHours = (value: string) => {
		const parsedQty = Number.parseInt(value)
		if (Number.isNaN(parsedQty)) {
			return
		} else if (parsedQty > 23) {
			setEstimate({
				...estimate,
				hours: "23",
			})
		} else {
			setEstimate({
				...estimate,
				hours: parsedQty.toString(),
			})
		}
		handleCheckIcon()
	}

	const onChangeMinutes = (value: string) => {
		const parsedQty = Number.parseInt(value)
		if (Number.isNaN(parsedQty)) {
			return
		} else if (parsedQty > 59) {
			setEstimate({
				...estimate,
				minutes: "59",
			})
		} else {
			setEstimate({
				...estimate,
				minutes: parsedQty < 10 ? "0" + parsedQty.toString() : parsedQty.toString(),
			})
		}
		handleCheckIcon()
	}

	const handleCheckIcon = () => {
		const intHour = Number.parseInt(estimate.hours)
		const intMinutes = Number.parseInt(estimate.minutes)
		if (estimate.hours !== "" && estimate.minutes !== "") {
			const seconds = intHour * 60 * 60 + intMinutes * 60
			setShowCheckIcon(seconds > 0)
		}
	}

	const handleSubmit = useCallback(async () => {
		if (!currentTask) return

		const hours = +estimate.hours
		const minutes = +estimate.minutes
		if (isNaN(hours) || isNaN(minutes) || (hours === 0 && minutes === 0)) {
			return
		}

		const { h: estimateHours, m: estimateMinutes } = secondsToTime(currentTask.estimate || 0)

		if (hours === estimateHours && minutes === estimateMinutes) {
			return
		}
		const task = {
			...currentTask,
			estimate: hours * 60 * 60 + minutes * 60, // time seconds
		}

		console.log("ESTIMATE")
		setShowCheckIcon(false)
		setIsLoading(true)
		const response = await updateTask(task, task.id)

		setEditing({ editingHour: false, editingMinutes: false })
		setIsLoading(false)
		if (setEditEstimate) setEditEstimate(false)
	}, [currentTask, updateTask, estimate])

	const formatTwoDigit = (value: string) => {
		const intValue = Number.parseInt(value)
		if (Number.isNaN(intValue)) {
			return "00"
		}

		if (intValue < 10) {
			return "0" + value
		} else {
			return value
		}
	}

	return (
		<View style={[styles.estimate, {}]}>
			<View>
				<TextInput
					maxLength={2}
					keyboardType={"numeric"}
					value={!editing.editingHour && formatTwoDigit(estimate.hours)}
					onFocus={() => setEditing({ ...editing, editingHour: true })}
					onEndEditing={() => setEditing({ ...editing, editingHour: false })}
					onChangeText={(text) => onChangeHours(text)}
					style={[
						styles.estimateInput,
						{ color: colors.primary },
						estimate.hours.length !== 0 && { borderBottomColor: colors.tertiary },
					]}
				/>
				<View style={styles.wrapDash}>
					<View style={styles.dash} />
					<View style={styles.dash} />
					<View />
				</View>
			</View>
			<Text style={[styles.suffix, { color: colors.primary }]}> h</Text>
			<Text style={{ margin: 2 }}>:</Text>
			<View>
				<TextInput
					maxLength={2}
					keyboardType={"numeric"}
					onFocus={() => setEditing({ ...editing, editingMinutes: true })}
					onEndEditing={() => setEditing({ ...editing, editingMinutes: false })}
					value={!editing.editingMinutes && formatTwoDigit(estimate.minutes)}
					onChangeText={(text) => onChangeMinutes(text)}
					style={[
						styles.estimateInput,
						{ color: colors.primary },
						estimate.minutes.length > 0 && { borderBottomColor: colors.tertiary },
					]}
				/>
				<View style={styles.wrapDash}>
					<View style={styles.dash} />
					<View style={styles.dash} />
					<View />
				</View>
			</View>
			<Text style={[styles.suffix, { color: colors.primary }]}> m</Text>
			{showCheckIcon && (
				<Feather
					style={styles.thickIconStyle}
					size={25}
					color={"green"}
					name="check"
					onPress={() => handleSubmit()}
				/>
			)}
			{isLoading ? <ActivityIndicator size={14} color="#1B005D" style={styles.loading} /> : null}
		</View>
	)
}

export default EstimateTime

const styles = StyleSheet.create({
	checkButton: {
		margin: 2,
	},
	dash: { backgroundColor: "black", height: 1, width: 5 },
	estimate: {
		alignItems: "center",
		borderRadius: 8,
		flexDirection: "row",
		justifyContent: "space-between",
		marginLeft: "auto",
		marginRight: 10,
	},
	estimateInput: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
	},
	loading: {
		position: "absolute",
		right: -18,
	},
	suffix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
	},
	thickIconStyle: {
		position: "absolute",
		right: -26,
	},
	wrapDash: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 2 },
})
