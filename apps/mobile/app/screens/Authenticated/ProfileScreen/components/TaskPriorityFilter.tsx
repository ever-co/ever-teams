/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from "react"
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	ScrollView,
	Dimensions,
	Animated,
	Modal,
	TouchableWithoutFeedback,
} from "react-native"
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { observer } from "mobx-react-lite"
import { typography, useAppTheme } from "../../../../theme"
import { useTaskPriorityValue } from "../../../../components/StatusType"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { ITaskFilter } from "../../../../services/hooks/features/useTaskFilters"
import { useTaskPriority } from "../../../../services/hooks/features/useTaskPriority"
import { ITaskPriorityItem } from "../../../../services/interfaces/ITaskPriority"

interface TaskPriorityFilterProps {
	showPriorityPopup: boolean
	setShowPriorityPopup: (value: boolean) => unknown
	taskFilter: ITaskFilter
}

const { height } = Dimensions.get("window")

const TaskPriorityFilter: FC<TaskPriorityFilterProps> = observer(
	({ setShowPriorityPopup, showPriorityPopup, taskFilter }) => {
		const { colors } = useAppTheme()
		const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])

		useEffect(() => {
			taskFilter.onChangeStatusFilter("priority", selectedPriorities)
			taskFilter.applyStatusFilter()
		}, [selectedPriorities])

		return (
			<>
				<TouchableOpacity onPress={() => setShowPriorityPopup(!showPriorityPopup)}>
					<View style={{ ...styles.container, borderColor: colors.divider }}>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Text style={{ marginRight: 10, color: colors.primary }}>Priorities</Text>
							{selectedPriorities.length === 0 ? null : (
								<FontAwesome name="circle" size={24} color={colors.secondary} />
							)}
						</View>
						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
				<TaskStatusFilterDropDown
					visible={showPriorityPopup}
					onDismiss={() => setShowPriorityPopup(false)}
					selectedPriorities={selectedPriorities}
					setSelectedPriorities={setSelectedPriorities}
				/>
			</>
		)
	},
)

interface DropDownProps {
	visible: boolean
	onDismiss: () => unknown
	selectedPriorities: string[]
	setSelectedPriorities: (s: string[]) => unknown
}

const TaskStatusFilterDropDown: FC<DropDownProps> = observer(
	({ visible, onDismiss, setSelectedPriorities, selectedPriorities }) => {
		const { colors, dark } = useAppTheme()
		const { allTaskPriorities } = useTaskPriority()

		return (
			<ModalPopUp visible={visible} onDismiss={onDismiss}>
				<TouchableWithoutFeedback>
					<View
						style={[
							styles.dropdownContainer,
							{
								backgroundColor: colors.background,
								shadowColor: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
							},
						]}
					>
						<View style={styles.secondContainer}>
							<Text style={[styles.dropdownTitle, { color: colors.primary }]}>Statuses</Text>
							<ScrollView bounces={false} style={{ paddingHorizontal: 16, height: height / 2.55 }}>
								{allTaskPriorities.map((item, idx) => (
									<DropDownItem
										selectedPriorities={selectedPriorities}
										setSelectedPriorities={setSelectedPriorities}
										priority={item}
										key={idx}
									/>
								))}
							</ScrollView>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</ModalPopUp>
		)
	},
)

const DropDownItem = observer(
	({
		priority,
		selectedPriorities,
		setSelectedPriorities,
	}: {
		priority: ITaskPriorityItem
		selectedPriorities: string[]
		setSelectedPriorities: (s: string[]) => unknown
	}) => {
		const allPriorities = useTaskPriorityValue()
		const priorityItem = allPriorities[priority.name.split("-").join(" ")]
		const { dark } = useAppTheme()

		const exist = selectedPriorities.find((s) => s === priorityItem?.name)

		const onSelectedPriority = () => {
			if (exist) {
				const newStatuses = selectedPriorities.filter((s) => s !== priorityItem?.name)
				setSelectedPriorities([...newStatuses])
			} else {
				setSelectedPriorities([...selectedPriorities, priorityItem?.name])
			}
		}

		return (
			<TouchableOpacity
				style={{ ...styles.itemContainer, backgroundColor: dark && "#2E3138" }}
				onPress={() => onSelectedPriority()}
			>
				<View style={{ ...styles.dropdownItem, backgroundColor: priorityItem?.bgColor }}>
					{priorityItem?.icon}
					<Text style={styles.itemText}>
						{limitTextCharaters({ text: priorityItem?.name, numChars: 17 })}
					</Text>
				</View>
				{exist ? (
					<AntDesign name="checkcircle" size={24} color="#27AE60" />
				) : (
					<Feather name="circle" size={24} color="rgba(40, 32, 72, 0.43)" />
				)}
			</TouchableOpacity>
		)
	},
)

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
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={$modalBackGround}>
					<Animated.View
						style={{
							transform: [{ scale: scaleValue }],
							flex: 1,
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "flex-end",
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.16)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 57,
		justifyContent: "space-between",
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 16,
		paddingVertical: 10,
		width: 176,
		zIndex: 1000,
	},
	dropdownContainer: {
		borderRadius: 20,
		minHeight: height / 2.3,
		width: "95%",
		zIndex: 1001,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 10,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 1,
		shadowRadius: 10,
	},
	dropdownItem: {
		alignItems: "center",
		borderRadius: 10,
		elevation: 10,
		flexDirection: "row",
		height: 44,
		paddingHorizontal: 16,
		width: "60%",
	},
	dropdownTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginBottom: 5,
		marginLeft: 16,
	},
	itemContainer: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.2)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 56,
		justifyContent: "space-between",
		marginVertical: 5,
		paddingLeft: 6,
		paddingRight: 18,
		width: "100%",
	},
	itemText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		marginLeft: 10,
	},
	secondContainer: {
		marginVertical: 16,
	},
})

export default TaskPriorityFilter
