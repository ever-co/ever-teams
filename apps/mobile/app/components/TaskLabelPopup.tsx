/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	Text,
	FlatList,
	TouchableOpacity,
	TouchableWithoutFeedback,
} from "react-native"
import { Feather, AntDesign, Ionicons } from "@expo/vector-icons"
import { spacing, useAppTheme, typography } from "../theme"
import { ITaskLabelItem } from "../services/interfaces/ITaskLabel"
import { useTaskLabels } from "../services/hooks/features/useTaskLabels"
import { BadgedTaskLabel } from "./LabelIcon"
import { translate } from "../i18n"
import TaskLabelForm from "../screens/Authenticated/TaskLabelScreen/components/TaskLabelForm"
import { BlurView } from "expo-blur"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
	labelNames: ITaskLabelItem[]
	saveLabels: () => void
	arrayChanged: boolean
	addOrRemoveLabels: (label: ITaskLabelItem) => void
	canCreateLabel?: boolean
}

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
				tint="light"
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

const TaskLabelPopup: FC<Props> = function TaskLabelPopup({
	visible,
	onDismiss,
	saveLabels,
	arrayChanged,
	addOrRemoveLabels,
	labelNames,
	canCreateLabel = false,
}) {
	const { allTaskLabels } = useTaskLabels()
	const { updateLabel, createLabel } = useTaskLabels()
	const { colors, dark } = useAppTheme()

	const [createTaskMode, setCreateTaskMode] = useState<boolean>(false)

	const onLabelSelected = (label: ITaskLabelItem) => {
		addOrRemoveLabels(label)
	}

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View
				style={{
					...styles.container,
					backgroundColor: colors.background,
					height: canCreateLabel ? 460 : 396,
					overflow: canCreateLabel ? "hidden" : "scroll",
				}}
			>
				{!createTaskMode ? (
					<>
						<Text style={{ ...styles.title, color: colors.primary }}>
							{translate("settingScreen.labelScreen.labels")}
						</Text>
						<FlatList
							data={allTaskLabels}
							contentContainerStyle={{ paddingHorizontal: 10 }}
							renderItem={({ item }) => (
								<Item
									currentLabelNames={labelNames}
									onLabelSelected={onLabelSelected}
									label={item}
								/>
							)}
							legacyImplementation={true}
							showsVerticalScrollIndicator={true}
							keyExtractor={(_, index) => index.toString()}
						/>
						{canCreateLabel && !arrayChanged ? (
							<TouchableOpacity
								style={{
									...styles.createButton,
									borderColor: dark ? "#6755C9" : "#3826A6",
								}}
								onPress={() => setCreateTaskMode(true)}
							>
								<Ionicons
									name="add"
									size={24}
									color={dark ? "#6755C9" : "#3826A6"}
								/>
								<Text
									style={{
										...styles.btnText,
										color: dark ? "#6755C9" : "#3826A6",
									}}
								>
									{translate("settingScreen.labelScreen.createNewLabelText")}
								</Text>
							</TouchableOpacity>
						) : (
							<View style={styles.wrapButtons}>
								<TouchableOpacity
									onPress={onDismiss}
									style={[styles.button, { backgroundColor: "#E6E6E9" }]}
								>
									<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>
										{translate("common.cancel")}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={saveLabels}
									style={[styles.button, { backgroundColor: "#3826A6" }]}
								>
									<Text style={styles.buttonText}>
										{translate("common.save")}
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</>
				) : (
					<TaskLabelForm
						onDismiss={() => {
							setCreateTaskMode(false)
						}}
						onUpdateLabel={updateLabel}
						onCreateLabel={createLabel}
						isEdit={false}
					/>
				)}
			</View>
		</ModalPopUp>
	)
}

export default TaskLabelPopup

interface ItemProps {
	currentLabelNames: ITaskLabelItem[]
	label: ITaskLabelItem
	onLabelSelected: (size: ITaskLabelItem) => unknown
}
const Item: FC<ItemProps> = ({ currentLabelNames, label, onLabelSelected }) => {
	const { colors } = useAppTheme()
	const selected = currentLabelNames?.find((l) => l.name === label.name)
	return (
		<TouchableOpacity onPress={() => onLabelSelected(label)}>
			<View style={{ ...styles.wrapperItem, borderColor: colors.border }}>
				<View style={{ ...styles.colorFrame, backgroundColor: label.color }}>
					<BadgedTaskLabel iconSize={16} TextSize={14} label={label} />
				</View>
				<View>
					{!selected ? (
						<Feather name="circle" size={24} color={colors.divider} />
					) : (
						<AntDesign name="checkcircle" size={24} color="#27AE60" />
					)}
				</View>
			</View>
		</TouchableOpacity>
	)
}

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	btnText: {
		color: "#3826A6",
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		fontStyle: "normal",
	},
	button: {
		alignItems: "center",
		borderRadius: 11,
		height: 55,
		justifyContent: "center",
		padding: 10,
		width: 140,
	},
	buttonText: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	colorFrame: {
		borderRadius: 10,
		height: 44,
		justifyContent: "center",
		paddingLeft: 16,
		width: 180,
	},
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: "90%",
	},
	createButton: {
		alignItems: "center",
		alignSelf: "center",
		borderColor: "#3826A6",
		borderRadius: 12,
		borderWidth: 2,
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 10,
		padding: 12,
		width: "80%",
	},
	title: {
		fontSize: spacing.medium - 2,
		marginBottom: 16,
		marginHorizontal: 10,
	},
	wrapButtons: {
		flexDirection: "row",
		gap: 20,
		justifyContent: "center",
		marginTop: 10,
	},
	wrapperItem: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
		padding: 6,
		paddingRight: 18,
		width: "100%",
	},
})
