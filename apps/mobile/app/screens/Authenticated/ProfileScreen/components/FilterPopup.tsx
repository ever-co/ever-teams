/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import {
	View,
	Text,
	ViewStyle,
	Modal,
	StyleSheet,
	Animated,
	Dimensions,
	TouchableWithoutFeedback,
	TouchableOpacity,
} from "react-native"

// COMPONENTS
import { typography, useAppTheme } from "../../../../theme"
import { ITaskFilter } from "../../../../services/hooks/features/useTaskFilters"
import TaskPriorityFilter from "./TaskPriorityFilter"
import TaskStatusFilter from "./TaskStatusFilter"
import TaskLabelFilter from "./TaskLabelFilter"
import TaskSizeFilter from "./TaskSizeFilter"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
	hook: ITaskFilter
}

export interface IFilter {
	statuses: string[]
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

const FilterPopup: FC<Props> = function FilterPopup({ visible, onDismiss, hook }) {
	const { colors } = useAppTheme()

	const [showTaskStatus, setShowTaskStatus] = useState(false)
	const [showTaskLabel, setShowTaskLabel] = useState(false)
	const [showTaskPriority, setShowTaskPriority] = useState(false)
	const [showTaskSize, setShowTaskSize] = useState(false)

	return (
		<ModalPopUp visible={visible}>
			<>
				<TouchableWithoutFeedback>
					<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
						<View style={{ width: "100%", marginBottom: 10 }}>
							<Text style={{ ...styles.mainTitle, color: colors.primary }}>Filter</Text>
						</View>

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
								showTaskStatus={showTaskStatus}
								setShowTaskStatus={setShowTaskStatus}
								taskFilter={hook}
							/>

							<TaskPriorityFilter
								taskFilter={hook}
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
								taskFilter={hook}
								showLabelPopup={showTaskLabel}
								setShowLabelPopup={setShowTaskLabel}
							/>

							<TaskSizeFilter
								taskFilter={hook}
								showSizePopup={showTaskSize}
								setShowSizePopup={setShowTaskSize}
							/>
						</View>

						<View style={styles.wrapButtons}>
							<TouchableOpacity
								onPress={() => {
									hook.onResetStatusFilter()
									onDismiss()
								}}
								style={[styles.button, { backgroundColor: "#E6E6E9" }]}
							>
								<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>Reset</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.button, { backgroundColor: "#3826A6" }]}
								onPress={() => {
									hook.applyStatusFilter()
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
