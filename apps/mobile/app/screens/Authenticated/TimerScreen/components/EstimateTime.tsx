/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useRef, useState } from "react"
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
	setEstimateTime?: (value: number) => unknown
}
const EstimateTime: FC<Props> = ({ setEditEstimate, currentTask, setEstimateTime }) => {
	// Hooks
	const { updateTask } = useTeamTasks()
	const { colors } = useAppTheme()

	// STATES
	const textInputRef = useRef(null)
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
		textInputRef.current.blur()
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
		handleCheckIcon(value, estimate.minutes)
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
				minutes: parsedQty < 10 ? "0" + value : parsedQty.toString(),
			})
		}
		handleCheckIcon(estimate.hours, value)
	}

	const handleCheckIcon = (h: string, m: string) => {
		const intHour = Number.parseInt(h)
		const intMinutes = Number.parseInt(m)
		if (estimate.hours !== "" || estimate.minutes !== "") {
			const seconds = intHour * 60 * 60 + intMinutes * 60
			setShowCheckIcon(seconds > 0)
		}
	}

	const handleSubmit = useCallback(async () => {
		const hours = +estimate.hours
		const minutes = +estimate.minutes
		setShowCheckIcon(false)
		if (currentTask) {
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

			setIsLoading(true)
			await updateTask(task, task.id)
			setIsLoading(false)

			setEditing({ editingHour: false, editingMinutes: false })

			textInputRef.current.blur()
			if (setEditEstimate) setEditEstimate(false)
		} else {
			setEstimateTime(hours * 60 * 60 + minutes * 60)
		}
	}, [currentTask, updateTask, estimate])

	const formatTwoDigit = (value: string) => {
		const intValue = Number.parseInt(value)
		if (Number.isNaN(intValue)) {
			return "00"
		}

		if (intValue < 10) {
			return "0" + intValue
		} else {
			return value
		}
	}

	return (
		<View style={[styles.estimate, {}]}>
			<View>
				<TextInput
					ref={textInputRef}
					maxLength={2}
					keyboardType={"numeric"}
					value={editing.editingHour ? undefined : formatTwoDigit(estimate.hours)}
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
					<View style={{ ...styles.dash, backgroundColor: colors.primary }} />
					<View style={{ ...styles.dash, backgroundColor: colors.primary }} />
					<View />
				</View>
			</View>
			<Text style={[styles.suffix, { color: colors.primary }]}>{" h"}</Text>
			<Text style={{ margin: 2 }}>:</Text>

			<View>
				<TextInput
					ref={textInputRef}
					maxLength={2}
					keyboardType={"numeric"}
					onFocus={() => setEditing({ ...editing, editingMinutes: true })}
					onEndEditing={() => setEditing({ ...editing, editingMinutes: false })}
					value={editing.editingMinutes ? undefined : formatTwoDigit(estimate.minutes)}
					onChangeText={(text) => onChangeMinutes(text)}
					style={[
						styles.estimateInput,
						{ color: colors.primary },
						estimate.minutes.length > 0 && { borderBottomColor: colors.tertiary },
					]}
				/>
				<View style={styles.wrapDash}>
					<View style={{ ...styles.dash, backgroundColor: colors.primary }} />
					<View style={{ ...styles.dash, backgroundColor: colors.primary }} />
					<View />
				</View>
			</View>
			<Text style={[styles.suffix, { color: colors.primary }]}>{" m"}</Text>
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
	dash: { height: 1, width: 5 },
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
