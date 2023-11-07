/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import {
	View,
	Text,
	Animated,
	Modal,
	TouchableWithoutFeedback,
	ViewStyle,
	StyleSheet,
	ActivityIndicator,
	Pressable,
	TextInput,
} from "react-native"
import React, { useCallback, useEffect, useRef, useState } from "react"
import ComboBox from "../../../screens/Authenticated/TimerScreen/components/ComboBox"
import { translate } from "../../../i18n"
import IssuesModal from "../../IssuesModal"
import { useStores } from "../../../models"
import { useTaskInput } from "../../../services/hooks/features/useTaskInput"
import { typography, useAppTheme } from "../../../theme"
import { Feather } from "@expo/vector-icons"
import { ITeamTask } from "../../../services/interfaces/ITask"
import { BlurView } from "expo-blur"

interface ICreateParentTaskModal {
	visible: boolean
	onDismiss: () => void
	task: ITeamTask
}

const CreateParentTaskModal: React.FC<ICreateParentTaskModal> = ({ visible, onDismiss, task }) => {
	const { colors } = useAppTheme()

	const taskInput = useTaskInput()
	const {
		setEditMode,
		setQuery,
		activeTask,
		editMode,
		// isModalOpen,
		hasCreateForm,
		handleTaskCreation,
		createLoading,
	} = taskInput

	const [combxShow, setCombxShow] = useState<boolean>(true)
	const inputRef = useRef<TextInput>(null)
	const {
		TimerStore: { localTimerStatus },
	} = useStores()

	const closeCombox = useCallback(() => {
		setCombxShow(false)
	}, [setCombxShow])

	useEffect(() => {
		setEditMode(true)
		setCombxShow(true)
	}, [editMode, combxShow])

	useEffect(() => {
		if (!editMode) {
			inputRef.current?.blur()
		}
	}, [editMode])

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View
					style={[
						styles.wrapInput,
						{
							flexDirection: "row",
							alignItems: "center",
							borderColor: colors.border,
							backgroundColor: colors.background,
						},
					]}
				>
					<IssuesModal task={activeTask} />

					<Text style={styles.taskNumberStyle}>
						{!editMode && activeTask ? `#${activeTask.taskNumber} ` : ""}
					</Text>
					<TextInput
						ref={inputRef}
						selectionColor={colors.primary}
						placeholderTextColor={colors.tertiary}
						style={[
							styles.textInput,
							{
								backgroundColor: colors.background,
								color: colors.primary,
								width: "80%",
								opacity: localTimerStatus.running ? 0.5 : 1,
							},
						]}
						placeholder={translate("myWorkScreen.taskFieldPlaceholder")}
						defaultValue={activeTask ? activeTask.title : ""}
						autoFocus={false}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!localTimerStatus.running}
						onFocus={() => setEditMode(true)}
						// onBlur={() => setEditMode(false)}
						onChangeText={(newText) => setQuery(newText)}
					/>
					{hasCreateForm && editMode && !createLoading ? (
						<Pressable
							onPress={() => {
								handleTaskCreation()
								// setEditMode(false)
							}}
						>
							<Feather name="check" size={24} color="green" />
						</Pressable>
					) : null}

					{createLoading ? (
						<ActivityIndicator color={colors.primary} style={styles.loading} />
					) : null}
				</View>
				{combxShow && (
					<ComboBox
						childTask={task}
						onDismiss={onDismiss}
						parentTasksFilter={true}
						closeCombo={closeCombox}
						setEditMode={setEditMode}
						tasksHandler={taskInput}
					/>
				)}
			</View>
		</ModalPopUp>
	)
}

export default CreateParentTaskModal

const ModalPopUp = ({ visible, children, onDismiss }) => {
	const [showModal, setShowModal] = React.useState(visible)
	const scaleValue = React.useRef(new Animated.Value(0)).current
	const modalRef = useRef(null)

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

	const handlePressOutside = (event) => {
		const { locationX, locationY } = event.nativeEvent

		if (modalRef.current) {
			modalRef.current.measureInWindow((x, y, width, height) => {
				if (
					locationX < x ||
					locationX > x + width ||
					locationY < y ||
					locationY > y + height
				) {
					onDismiss()
				}
			})
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
			<TouchableWithoutFeedback onPress={handlePressOutside}>
				<View onTouchEnd={onDismiss} style={$modalBackGround}>
					<Animated.View ref={modalRef} style={{ transform: [{ scale: scaleValue }] }}>
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
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "90%",
	},
	loading: {
		right: 10,
	},
	taskNumberStyle: {
		color: "#7B8089",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginLeft: 5,
	},
	textInput: {
		backgroundColor: "#fff",
		borderRadius: 10,
		color: "rgba(40, 32, 72, 0.4)",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		height: 43,
		paddingHorizontal: 6,
		paddingVertical: 13,
		width: "80%",
	},
	wrapInput: {
		backgroundColor: "#fff",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 10,
		borderWidth: 1,
		height: 45,
		paddingHorizontal: 16,
		paddingVertical: 2,
		width: "100%",
	},
})
