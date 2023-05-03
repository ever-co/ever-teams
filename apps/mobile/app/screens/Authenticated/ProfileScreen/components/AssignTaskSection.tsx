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
} from "react-native"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { spacing, typography, useAppTheme } from "../../../../theme"
import { ActivityIndicator } from "react-native-paper"
import TaskLabel from "../../../../components/TaskLabel"
import TaskPriorities from "../../../../components/TaskPriority"
import TaskStatusDropdown from "../../TimerScreen/components/TaskStatusDropdown"
import TaskSize from "../../../../components/TaskSize"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { useStores } from "../../../../models"
import { translate } from "../../../../i18n"

export interface Props {
	visible: boolean
	memberId: string
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
			<View style={$modalBackGround}>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</View>
		</Modal>
	)
}

const AssignTaskFormModal: FC<Props> = function InviteUserModal({ visible, onDismiss, memberId }) {
	const {
		authenticationStore: { user },
	} = useStores()

	const isAuthUser = user?.id === memberId

	const [taskInputText, setTaskInputText] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [, setShowCheckIcon] = useState<boolean>(false)

	const { colors } = useAppTheme()

	const onCreateNewTask = async () => {
		setShowCheckIcon(false)
		setIsLoading(true)
		// await createAndAssign(taskInputText)
		setIsLoading(false)
		setTaskInputText("")
		onDismiss()
	}

	const handleChangeText = (value: string) => {
		setTaskInputText(value)
		if (value.trim().length > 0) {
			setShowCheckIcon(false)
		}
		if (value.trim().length >= 3) {
			setShowCheckIcon(true)
		}
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
								defaultValue={""}
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
								<View style={{ flexDirection: "row", alignItems: "center" }}>
									<Text style={{ textAlign: "center", fontSize: 12, color: "#7E7991" }}>
										{translate("myWorkScreen.estimateLabel")}:{" "}
									</Text>
									<EstimateTime currentTask={undefined} />
								</View>
								<TaskSize />
							</View>
							<View
								style={{
									flexDirection: "row",
									width: "100%",
									justifyContent: "space-between",
									zIndex: 1000,
								}}
							>
								<View style={{ width: 136, height: 32 }}>
									<TaskStatusDropdown task={undefined} />
								</View>
								<TaskPriorities />
							</View>
							<View style={{ width: "100%", marginVertical: 20, zIndex: 999 }}>
								<TaskLabel />
							</View>
						</View>
					</View>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => onDismiss()}
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

const $container: ViewStyle = {
	...GS.flex1,
	paddingTop: spacing.extraLarge + spacing.large,
	paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",

	justifyContent: "flex-end",
}

const $modalContainer: ViewStyle = {
	width: "100%",
	height,
	backgroundColor: "white",
	paddingHorizontal: 30,
	paddingVertical: 30,
	borderRadius: 30,
	elevation: 20,
	justifyContent: "center",
}

const styles = StyleSheet.create({
	blueBottom: {
		borderBottomWidth: 2,
		borderColor: "#1B005D",
		marginBottom: 25,
		width: "100%",
	},
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
	crossIcon: {
		position: "absolute",
		right: 10,
		top: 10,
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
		height: height / 2,
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
	theTextField: {
		borderWidth: 0,
		width: "100%",
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
