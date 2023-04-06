import React, { FC, useEffect, useState } from "react"
import {
	View,
	Text,
	ViewStyle,
	Modal,
	StyleSheet,
	TextInput,
	Animated,
	Dimensions,
	TouchableOpacity,
	TouchableWithoutFeedback,
} from "react-native"
import { BlurView } from "expo-blur"

// COMPONENTS

// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { translate } from "../../../../i18n"
import TaskStatusFilter from "./TaskStatusFilter"
import { ITaskStatus } from "../../../../services/interfaces/ITask"
import TaskLabelFilter from "./TaskLabelFilter"
import { useStores } from "../../../../models"
import TaskPriorityFilter from "./TaskPriorityFilter"
import TaskSizeFilter from "./TaskSizeFilter"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
}

export interface IFilter {
	statuses: ITaskStatus[]
	labels: string[]
	sizes: string[]
	priorities: string[]
	apply: boolean
}

const { width, height } = Dimensions.get("window")
const ModalPopUp = ({ visible, children }) => {
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
			<View style={$modalBackGround}>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</View>
		</Modal>
	)
}

const FilterPopup: FC<Props> = function FilterPopup({ visible, onDismiss }) {
	const {
		TaskStore: { setFilter, filter },
	} = useStores()
	const { colors } = useAppTheme()
	const [showTaskStatus, setShowTaskStatus] = useState(false)
	const [showTaskLabel, setShowTaskLabel] = useState(false)
	const [showTaskPriority, setShowTaskPriority] = useState(false)
	const [showTaskSize, setShowTaskSize] = useState(false)

	const onPressOutSide = () => {
		setShowTaskLabel(false)
		setShowTaskPriority(false)
		setShowTaskSize(false)
		setShowTaskStatus(false)
	}

	useEffect(() => {
		if (showTaskStatus) {
			setShowTaskLabel(false)
			setShowTaskPriority(false)
			setShowTaskSize(false)
		}
	}, [showTaskStatus])

	useEffect(() => {
		if (showTaskLabel) {
			setShowTaskSize(false)
			setShowTaskPriority(false)
			setShowTaskStatus(false)
		}
	}, [showTaskLabel])

	useEffect(() => {
		if (showTaskSize) {
			setShowTaskLabel(false)
			setShowTaskPriority(false)
			setShowTaskStatus(false)
		}
	}, [showTaskSize])

	useEffect(() => {
		if (showTaskPriority) {
			setShowTaskLabel(false)
			setShowTaskStatus(false)
			setShowTaskSize(false)
		}
	}, [showTaskPriority])

	return (
		<ModalPopUp visible={visible}>
			<>
				{showTaskStatus && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
				<TouchableWithoutFeedback onPress={() => onPressOutSide()}>
					<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
						<View style={{ width: "100%" }}>
							<Text style={{ ...styles.mainTitle, color: colors.primary }}>Filter</Text>
						</View>

						<View style={styles.wrapForm}>
							<View
								style={{
									width: "100%",
									alignItems: "center",
									flexDirection: "row",
									justifyContent: "space-between",
									zIndex: 999,
								}}
							>
								<TaskStatusFilter
									containerStyle={styles.statusContainer}
									dropdownContainerStyle={{
										width: width / 2,
										top: -400,
										zIndex: 1000,
									}}
									showTaskStatus={showTaskStatus}
									setShowTaskStatus={setShowTaskStatus}
								/>

								<TaskPriorityFilter
									containerStyle={styles.statusContainer}
									dropdownContainerStyle={{
										width: width / 2,
										top: -400,
									}}
									showPriorityPopup={showTaskPriority}
									setShowPriorityPopup={setShowTaskPriority}
								/>
							</View>

							<View
								style={{
									width: "100%",
									alignItems: "center",
									flexDirection: "row",
									justifyContent: "space-between",
									marginTop: 16,
								}}
							>
								<TaskLabelFilter
									containerStyle={styles.statusContainer}
									dropdownContainerStyle={{
										width: width / 2,
										top: -475,
									}}
									showLabelPopup={showTaskLabel}
									setShowLabelPopup={setShowTaskLabel}
								/>

								<TaskSizeFilter
									containerStyle={styles.statusContainer}
									dropdownContainerStyle={{
										width: width / 2,
										top: -475,
										zIndex: 100,
									}}
									showSizePopup={showTaskSize}
									setShowSizePopup={setShowTaskSize}
								/>
							</View>
						</View>

						<View style={styles.wrapButtons}>
							<TouchableOpacity
								onPress={() => {
									setFilter({
										statuses: [],
										labels: [],
										priorities: [],
										sizes: [],
										apply: false,
									})
									onDismiss()
								}}
								style={[styles.button, { backgroundColor: "#E6E6E9" }]}
							>
								<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>Reset</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.button, { backgroundColor: "#3826A6" }]}
								onPress={() => {
									setFilter({
										...filter,
										apply: true,
									})
									onDismiss()
								}}
							>
								<Text style={styles.buttonText}>Apply</Text>
							</TouchableOpacity>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</>
		</ModalPopUp>
	)
}

export default FilterPopup

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "flex-end",
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		borderRadius: 11,
		height: height / 16,
		justifyContent: "center",
		padding: 10,
		width: width / 2.5,
	},
	buttonText: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	mainContainer: {
		alignItems: "center",
		backgroundColor: "yellow",
		borderColor: "#1B005D0D",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		borderWidth: 2,
		paddingHorizontal: 20,
		paddingVertical: 30,
		shadowColor: "#1B005D0D",
		shadowOffset: { width: 10, height: 10 },
		shadowRadius: 10,
		width: "100%",
		zIndex: 1000,
	},
	mainTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	statusContainer: {
		height: 57,
		paddingHorizontal: 16,
		paddingVertical: 10,
		width: 156,
		zIndex: 1000,
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 40,
		width: "100%",
		zIndex: 999,
	},
	wrapForm: {
		marginTop: 16,
		width: "100%",
		zIndex: 100,
	},
})

const $blurContainer: ViewStyle = {
	height,
	width: "100%",
	position: "absolute",
	top: 0,
	zIndex: 100,
}
