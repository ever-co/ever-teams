/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
	View,
	StyleSheet,
	TextInput,
	Text,
	ViewStyle,
	TouchableWithoutFeedback,
	Dimensions,
	Pressable,
} from "react-native"
import { ActivityIndicator } from "react-native-paper"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import ComboBox from "./ComboBox"
import EstimateTime from "./EstimateTime"
import { Feather } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import TaskPriorities from "../../../../components/TaskPriority"
// import TaskLabel from "../../../../components/TaskLabel"
import { typography, useAppTheme } from "../../../../theme"
import { translate } from "../../../../i18n"
import TaskStatus from "../../../../components/TaskStatus"
import TimerCard from "../../../../components/TimerCard"
import TaskSize from "../../../../components/TaskSize"
import { RTuseTaskInput } from "../../../../services/hooks/features/useTaskInput"
import TaskLabels from "../../../../components/TaskLabels"
import IssuesModal from "../../../../components/IssuesModal"
import { useStores } from "../../../../models"

const TimerTaskSection = observer(
	({ taskInput, outsideClick }: { taskInput: RTuseTaskInput; outsideClick: () => unknown }) => {
		const { colors } = useAppTheme()
		const {
			setEditMode,
			setQuery,
			activeTask,
			editMode,
			isModalOpen,
			hasCreateForm,
			handleTaskCreation,
			createLoading,
		} = taskInput

		const [combxShow, setCombxShow] = useState<boolean>(false)
		const inputRef = useRef<TextInput>(null)
		const {
			TimerStore: { localTimerStatus },
		} = useStores()

		const closeCombox = useCallback(() => {
			setCombxShow(false)
		}, [setCombxShow])

		useEffect(() => {
			if (isModalOpen || editMode) {
				setCombxShow(true)
			} else {
				setCombxShow(false)
			}
		}, [isModalOpen, editMode])

		useEffect(() => {
			if (!editMode) {
				inputRef.current.blur()
			}
		}, [editMode])

		return (
			<TouchableWithoutFeedback onPress={() => outsideClick()}>
				<View style={{ ...$timerSection, backgroundColor: colors.background }}>
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
									setEditMode(false)
								}}
							>
								<Feather name="check" size={24} color="green" />
							</Pressable>
						) : null}

						{createLoading ? (
							<ActivityIndicator color={colors.primary} style={styles.loading} />
						) : null}
					</View>

					{combxShow ? (
						<ComboBox
							closeCombo={() => closeCombox()}
							setEditMode={setEditMode}
							tasksHandler={taskInput}
						/>
					) : (
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
										width: width / 2.7,
									}}
								>
									<Text
										style={{
											textAlign: "center",
											fontSize: 12,
											color: colors.tertiary,
										}}
									>
										{translate("myWorkScreen.estimateLabel")} :{" "}
									</Text>
									<EstimateTime currentTask={activeTask} />
								</View>
								<TaskSize
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border,
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
								<TaskStatus
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border,
									}}
								/>

								<TaskPriorities
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border,
									}}
								/>
							</View>
							<TaskLabels
								task={activeTask}
								containerStyle={{
									...styles.sizeContainer,
									width: "100%",
									borderColor: colors.border,
									marginVertical: 20,
								}}
							/>
							<TimerCard />
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>
		)
	},
)
export default TimerTaskSection

const width = Dimensions.get("window").width

const $timerSection: ViewStyle = {
	marginTop: 20,
	padding: 20,
	marginHorizontal: 20,
	borderRadius: 16,
	...GS.noBorder,
	borderWidth: 1,
	shadowColor: "#000",
	shadowOffset: {
		width: 0,
		height: 14,
	},
	shadowOpacity: 0.1,
	shadowRadius: 44,
	elevation: 8,
}

const styles = StyleSheet.create({
	container: {},
	dashed: {
		borderBottomColor: "#fff",
		borderBottomWidth: 10,
	},
	estimate: {
		alignSelf: "flex-end",
		color: "#9490A0",
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 10,
	},
	horizontal: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 20,
	},
	horizontalInput: {
		alignItems: "flex-end",
		flexDirection: "row",
	},
	loading: {
		right: 10,
	},
	mainContainer: {
		backgroundColor: "#fff",
		borderRadius: 25,
		paddingTop: 30,
		padding: 20,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 5,
		shadowColor: "#1B005D0D",
		shadowOffset: { width: 10, height: 10.5 },
		shadowOpacity: 1,
		shadowRadius: 15,
	},
	sizeContainer: {
		alignItems: "center",
		borderColor: "rgba(255, 255, 255, 0.13)",
		borderWidth: 1,
		height: 32,
		paddingHorizontal: 9,
		width: width / 2.7,
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
	textInputOne: {
		height: 30,
	},
	working: {
		color: "#9490A0",
		fontWeight: "600",
		marginBottom: 10,
	},
	wrapBugIcon: {
		alignItems: "center",
		backgroundColor: "#C24A4A",
		borderRadius: 3,
		height: 20,
		justifyContent: "center",
		width: 20,
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
