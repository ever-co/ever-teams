/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
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
	KeyboardAvoidingView,
	Platform,
} from "react-native"
import { typography, useAppTheme } from "../../../../theme"
import { ActivityIndicator } from "react-native-paper"
import { QueryClient } from "react-query"
import TaskPriorities from "../../../../components/TaskPriority"
import TaskSize from "../../../../components/TaskSize"
import TaskLabels from "../../TimerScreen/components/TaskLabels"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { translate } from "../../../../i18n"
import { ICreateTask, ITeamTask } from "../../../../services/interfaces/ITask"
import TaskStatus from "../../../../components/TaskStatus"
import Version from "../../../../components/Version"

export interface Props {
	visible: boolean
	isAuthUser: boolean
	createNewTask: (task: ICreateTask) => Promise<{ data: ITeamTask; response: Response }>
	onDismiss: () => unknown
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
			<KeyboardAvoidingView
				style={$modalBackGround}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

const AssignTaskFormModal: FC<Props> = function AssignTaskFormModal({
	visible,
	onDismiss,
	createNewTask,
	isAuthUser,
}) {
	const queryClient = new QueryClient()
	const [taskInputText, setTaskInputText] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [newTask, setNewTask] = useState<ICreateTask>(null)

	const { colors } = useAppTheme()

	const onCreateNewTask = async () => {
		if (taskInputText.trim().length >= 3) {
			setIsLoading(true)
			await createNewTask({
				...newTask,
				title: taskInputText,
				estimate: newTask?.estimate || 0,
				status: newTask?.status || "open",
			}).then(() => queryClient.cancelQueries("tasks"))
			setIsLoading(false)
			setNewTask(null)
			setTaskInputText("")
			onDismiss()
		}
	}

	const handleChangeText = (value: string) => {
		setTaskInputText(value)
	}

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ width: "100%", marginBottom: 20 }}>
					<Text style={[styles.mainTitle, { color: colors.primary }]}>
						{isAuthUser
							? translate("tasksScreen.createTaskButton")
							: translate("tasksScreen.assignTaskButton")}
					</Text>
				</View>
				<View style={{ width: "100%" }}>
					<View style={{}}>
						<View
							style={[
								styles.wrapInput,
								{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "center",
									backgroundColor: colors.background,
									borderColor: colors.border,
								},
							]}
						>
							<TextInput
								selectionColor={colors.primary}
								placeholderTextColor={colors.tertiary}
								style={[
									styles.textInput,
									{ color: colors.primary, backgroundColor: colors.background },
								]}
								autoCorrect={false}
								autoCapitalize={"none"}
								placeholder={translate("myWorkScreen.taskFieldPlaceholder")}
								value={taskInputText}
								onChangeText={(newText) => handleChangeText(newText)}
							/>
							{isLoading ? <ActivityIndicator color="#1B005D" style={styles.loading} /> : null}
						</View>

						<View>
							<View
								style={{
									width: "100%",
									flexDirection: "row",
									marginVertical: 20,
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
									}}
								>
									<Text style={{ textAlign: "center", fontSize: 12, color: "#7E7991" }}>
										{translate("myWorkScreen.estimateLabel")}:{" "}
									</Text>
									<EstimateTime
										setEstimateTime={(e) =>
											setNewTask({
												...newTask,
												estimate: e,
											})
										}
										currentTask={undefined}
									/>
								</View>
								<TaskStatus
									status={newTask?.status}
									setStatus={(e) =>
										setNewTask({
											...newTask,
											status: e,
										})
									}
									containerStyle={{
										width: width / 2.1,
										height: 32,
									}}
								/>
							</View>
							<View
								style={{
									flexDirection: "row",
									width: "100%",
									justifyContent: "space-between",
									zIndex: 1000,
								}}
							>
								<TaskSize
									size={newTask?.size}
									setSize={(e) =>
										setNewTask({
											...newTask,
											size: e,
										})
									}
									containerStyle={{ width: width / 3.3 }}
								/>
								<TaskPriorities
									priority={newTask?.priority}
									setPriority={(e) =>
										setNewTask({
											...newTask,
											priority: e,
										})
									}
									containerStyle={{ width: width / 3.3 }}
								/>
								<Version
									containerStyle={{
										width: width / 5,
									}}
								/>
							</View>
							<View style={{ width: "100%", marginVertical: 20, zIndex: 999 }}>
								<TaskLabels
									newTaskLabels={newTask?.tags}
									setLabels={(e) =>
										setNewTask({
											...newTask,
											tags: e,
										})
									}
									containerStyle={{
										...styles.labelsContainer,
										width: "100%",
										borderColor: colors.border,
										marginVertical: 20,
									}}
								/>
							</View>
						</View>
					</View>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => {
								setNewTask(null)
								onDismiss()
							}}
							style={[styles.button, { backgroundColor: "#E6E6E9" }]}
						>
							<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>
								{translate("common.cancel")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, { backgroundColor: "#3826A6", opacity: isLoading ? 0.6 : 1 }]}
							onPress={() => onCreateNewTask()}
						>
							<Text style={styles.buttonText}>
								{isAuthUser
									? translate("tasksScreen.createButton")
									: translate("tasksScreen.assignButton")}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default AssignTaskFormModal

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
	labelsContainer: {
		alignItems: "center",
		borderColor: "rgba(255, 255, 255, 0.13)",
		borderWidth: 1,
		height: 32,
		paddingHorizontal: 9,
		width: width / 2.7,
	},
	loading: {
		position: "absolute",
		right: 10,
		top: 11,
	},
	mainContainer: {
		alignItems: "center",
		backgroundColor: "#fff",
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
	},
	mainTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	textInput: {
		backgroundColor: "#fff",
		borderRadius: 10,
		color: "rgba(40, 32, 72, 0.4)",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		height: 43,
		paddingHorizontal: 16,
		paddingVertical: 13,
		width: "90%",
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 10,
	},

	wrapInput: {
		backgroundColor: "#fff",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 10,
		borderWidth: 1,
		height: 45,
		paddingVertical: 2,
		width: "100%",
	},
})
