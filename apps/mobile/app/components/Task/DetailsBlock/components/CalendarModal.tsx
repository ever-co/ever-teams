/* eslint-disable react-native/no-inline-styles */
import {
	View,
	Text,
	Animated,
	Modal,
	TouchableWithoutFeedback,
	TouchableOpacity,
	ViewStyle,
	StyleSheet,
} from "react-native"
import React, { useEffect, useState } from "react"
import { useAppTheme } from "../../../../theme"
import { Calendar } from "react-native-calendars"
import moment from "moment-timezone"
import { SvgXml } from "react-native-svg"
import { trashIconSmall } from "../../../svgs/icons"
import { BlurView } from "expo-blur"
import { translate } from "../../../../i18n"

interface ICalendarModal {
	selectedDate: string
	isDueDate?: boolean
	updateTask: (date: string) => void
}

const CalendarModal: React.FC<ICalendarModal> = ({ selectedDate, isDueDate, updateTask }) => {
	const { colors } = useAppTheme()
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const [selected, setSelected] = useState<string>("")

	useEffect(() => {
		selectedDate && setSelected(moment(selectedDate).format("YYYY-MM-DD"))
	}, [selectedDate])

	const formatted = moment(selected).format("DD MMM YYYY")

	return (
		<View>
			<View style={styles.buttonWrapper}>
				<TouchableOpacity onPress={() => setModalVisible(true)}>
					<Text style={{ fontWeight: "600", fontSize: 12, color: colors.primary }}>
						{selected
							? formatted
							: isDueDate
							? translate("taskDetailsScreen.setDueDate")
							: translate("taskDetailsScreen.setStartDate")}
					</Text>
				</TouchableOpacity>

				{selected && selectedDate && (
					<TouchableOpacity
						onPress={() => {
							setSelected("")
							updateTask(null)
						}}
					>
						<SvgXml xml={trashIconSmall} />
					</TouchableOpacity>
				)}
			</View>

			<ModalPopUp visible={modalVisible} onDismiss={() => setModalVisible(false)}>
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<Calendar
						onDayPress={(day) => {
							setSelected(day.dateString)
							updateTask(moment(day.dateString).toISOString())
						}}
						markedDates={{
							[selected]: {
								selected: true,
								disableTouchEvent: true,
								selectedColor: colors.secondary,
								dotColor: "orange",
							},
						}}
						theme={{
							todayTextColor: colors.secondary,
							arrowColor: colors.secondary,
						}}
					/>
				</View>
			</ModalPopUp>
		</View>
	)
}

export default CalendarModal

const ModalPopUp = ({ visible, children, onDismiss }) => {
	const [showModal, setShowModal] = React.useState(visible)
	const scaleValue = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		toggleModal()
	}, [visible])
	const toggleModal = () => {
		if (visible) {
			setShowModal(true)
			Animated.spring(scaleValue, {
				toValue: 1,
				useNativeDriver: true,
			}).start()
		} else {
			setTimeout(() => setShowModal(false), 200)
			Animated.timing(scaleValue, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start()
		}
	}
	return (
		<Modal animationType="fade" transparent visible={showModal}>
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: "absolute",
					width: "100%",
					height: "100%",
				}}
			/>
			<TouchableWithoutFeedback onPress={onDismiss}>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: "center",
}

const styles = StyleSheet.create({
	buttonWrapper: {
		alignItems: "center",
		flexDirection: "row",
		height: 14,
		justifyContent: "space-between",
		width: 110,
	},
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "90%",
	},
})
