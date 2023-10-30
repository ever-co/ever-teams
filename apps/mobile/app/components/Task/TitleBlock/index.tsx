/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native"
import React, { SetStateAction, useCallback, useEffect, useState } from "react"
import { useStores } from "../../../models"
import { typography, useAppTheme } from "../../../theme"
import { SvgXml } from "react-native-svg"
import * as Clipboard from "expo-clipboard"
import { closeIconLight, copyIcon, editIcon, tickIconLight } from "../../svgs/icons"
import { useTeamTasks } from "../../../services/hooks/features/useTeamTasks"
import { showMessage } from "react-native-flash-message"
import { translate } from "../../../i18n"
import IssuesModal from "../../IssuesModal"
import { ITeamTask } from "../../../services/interfaces/ITask"
import { limitTextCharaters } from "../../../helpers/sub-text"
import CreateParentTaskModal from "./CreateParentTaskModal"
import { observer } from "mobx-react-lite"
import { useNavigation } from "@react-navigation/native"
import { SettingScreenNavigationProp } from "../../../navigators/AuthenticatedNavigator"

const TaskTitleBlock = observer(() => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { dark, colors } = useAppTheme()

	const [title, setTitle] = useState<string>("")
	const [edit, setEdit] = useState<boolean>(false)

	const { updateTitle } = useTeamTasks()

	const { width } = Dimensions.get("window")

	const saveTitle = useCallback((newTitle: string) => {
		if (newTitle.length > 255) {
			showMessage({
				message: translate("taskDetailsScreen.characterLimitErrorTitle"),
				description: translate("taskDetailsScreen.characterLimitErrorDescription"),
				type: "danger",
			})
			return
		}
		updateTitle(newTitle, task, true)
		setEdit(false)
	}, [])

	useEffect(() => {
		if (!edit) {
			task && setTitle(task?.title)
		}
	}, [task?.title, edit])

	const copyTitle = () => {
		Clipboard.setStringAsync(title)
		showMessage({
			message: translate("taskDetailsScreen.copyTitle"),
			type: "info",
			backgroundColor: colors.secondary,
		})
	}

	const responsiveFontSize = (): number => {
		const baseWidth = 428
		const scale = width / baseWidth
		const baseFontSize = 10

		const fontSize = Math.round(baseFontSize * scale)

		if (fontSize < 10) {
			return 10
		}

		return fontSize
	}

	return (
		<View style={{ gap: 18 }}>
			<View style={{ flexDirection: "row", gap: 5 }}>
				<TextInput
					multiline
					editable={edit}
					style={[
						styles.textInput,
						{
							color: colors.primary,
							borderColor: edit ? (dark ? "#464242" : "#e5e7eb") : "transparent",
							fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						},
					]}
					onChangeText={(text) => setTitle(text)}
					value={title}
				/>
				<TitleIcons
					dark={dark}
					edit={edit}
					setEdit={setEdit}
					copyTitle={copyTitle}
					saveTitle={() => saveTitle(title)}
				/>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
				<View style={styles.taskNumber}>
					<Text style={{ fontSize: 12 }}>#{task?.number}</Text>
				</View>
				<IssuesModal
					task={task}
					nameIncluded={true}
					responsiveFontSize={responsiveFontSize}
				/>

				{task?.issueType !== "Epic" && (
					<View
						style={{ borderRightWidth: 1, height: 24, borderRightColor: "#DBDBDB" }}
					/>
				)}

				{(!task?.issueType || task?.issueType === "Task" || task?.issueType === "Bug") &&
					task?.rootEpic &&
					task?.parentId !== task?.rootEpic.id && (
						<ParentTaskBadge
							responsiveFontSize={responsiveFontSize}
							task={{
								...task,
								parentId: task?.rootEpic.id,
								parent: task?.rootEpic,
							}}
						/>
					)}

				<ParentTaskBadge task={task} responsiveFontSize={responsiveFontSize} />

				<ParentTaskInput task={task} responsiveFontSize={responsiveFontSize} />
			</View>
		</View>
	)
})

export default TaskTitleBlock

interface ITitleIcons {
	dark: boolean
	edit: boolean
	setEdit: React.Dispatch<SetStateAction<boolean>>
	copyTitle: () => void
	saveTitle: () => void
}

const TitleIcons: React.FC<ITitleIcons> = ({ dark, edit, setEdit, copyTitle, saveTitle }) => {
	return (
		<>
			{edit ? (
				<View style={{ gap: 5 }}>
					<TouchableOpacity
						onPress={saveTitle}
						style={[
							styles.saveCancelButtons,
							{
								borderColor: dark ? "#464242" : "#e5e7eb",
							},
						]}
					>
						<SvgXml xml={tickIconLight} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setEdit(false)}
						style={[
							styles.saveCancelButtons,
							{
								borderColor: dark ? "#464242" : "#e5e7eb",
							},
						]}
					>
						<SvgXml xml={closeIconLight} />
					</TouchableOpacity>
				</View>
			) : (
				<View style={{ alignItems: "center", justifyContent: "center" }}>
					<TouchableOpacity onPress={() => setEdit(true)} style={styles.editButton}>
						<SvgXml xml={editIcon} />
					</TouchableOpacity>
					<TouchableOpacity onPress={copyTitle} style={styles.copyButton}>
						<SvgXml xml={copyIcon} />
					</TouchableOpacity>
				</View>
			)}
		</>
	)
}

const ParentTaskBadge: React.FC<{ task: ITeamTask; responsiveFontSize: () => number }> = observer(
	({ task, responsiveFontSize }) => {
		const navigation = useNavigation<SettingScreenNavigationProp<"TaskScreen">>()

		const navigateToParent = (): void => {
			navigation.navigate("TaskScreen", { taskId: task?.parentId || task?.parent.id })
		}
		return task?.parentId && task?.parent ? (
			<TouchableOpacity
				onPress={navigateToParent}
				style={{
					borderRadius: 3,
					alignItems: "center",
					justifyContent: "center",
					height: 24,
					paddingHorizontal: 8,
					paddingVertical: 2,
					backgroundColor:
						task?.parent?.issueType === "Epic"
							? "#8154BA"
							: task?.parent?.issueType === "Story"
							? "#54BA951A"
							: task?.parent?.issueType === "Bug"
							? "#C24A4A1A"
							: task?.parent?.issueType === "Task" || !task?.parent?.issueType
							? "#5483ba"
							: "",
				}}
			>
				<Text
					style={{
						fontSize: responsiveFontSize(),
						color:
							task?.parent?.issueType === "Epic"
								? "#FFFFFF"
								: task?.parent?.issueType === "Story"
								? "#27AE60"
								: task?.parent?.issueType === "Bug"
								? "#C24A4A"
								: task?.parent?.issueType === "Task" || !task?.parent?.issueType
								? "#FFFFFF"
								: "",
					}}
				>
					<Text
						style={{
							fontSize: responsiveFontSize(),
							color:
								task?.parent?.issueType === "Epic"
									? "#FFFFFF80"
									: task?.parent?.issueType === "Story"
									? "#27AE6080"
									: task?.parent?.issueType === "Bug"
									? "#C24A4A80"
									: task?.parent?.issueType === "Task" || !task?.parent?.issueType
									? "#FFFFFF"
									: "",
						}}
					>
						#{task?.parent?.taskNumber || task?.parent.number}
					</Text>
					{` - ${limitTextCharaters({ text: task?.parent?.title, numChars: 6 })}`}
				</Text>
			</TouchableOpacity>
		) : (
			<></>
		)
	},
)

const ParentTaskInput: React.FC<{ task: ITeamTask; responsiveFontSize: () => number }> = observer(
	({ task, responsiveFontSize }) => {
		const [modalVisible, setModalVisible] = useState<boolean>(false)
		return task && task?.issueType !== "Epic" ? (
			<TouchableOpacity
				style={{
					borderRadius: 3,
					alignItems: "center",
					justifyContent: "center",
					height: 24,
					paddingHorizontal: 8,
					paddingVertical: 2,
					borderWidth: 1,
					borderColor: "#f07258",
				}}
				onPress={() => setModalVisible(true)}
			>
				<Text
					style={{ fontSize: responsiveFontSize(), color: "#f07258", fontWeight: "600" }}
				>
					{task?.parentId
						? translate("taskDetailsScreen.changeParent")
						: "+ " + translate("taskDetailsScreen.addParent")}
				</Text>

				<CreateParentTaskModal
					visible={modalVisible}
					onDismiss={() => setModalVisible(false)}
					task={task}
				/>
			</TouchableOpacity>
		) : (
			<></>
		)
	},
)

const styles = StyleSheet.create({
	copyButton: {
		alignItems: "center",
		height: 30,
		justifyContent: "center",
		width: 30,
	},
	editButton: {
		alignItems: "center",
		backgroundColor: "#EDEDED",
		borderRadius: 100,
		height: 30,
		justifyContent: "center",
		padding: 5,
		width: 30,
	},
	saveCancelButtons: {
		borderRadius: 5,
		borderWidth: 1,
		padding: 3,
	},
	taskNumber: {
		alignItems: "center",
		backgroundColor: "#D6D6D6",
		borderRadius: 3,
		height: 24,
		justifyContent: "center",
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	textInput: {
		borderRadius: 5,
		borderWidth: 1,
		flex: 1,
		fontSize: 20,
		fontWeight: "600",
		maxHeight: 150,
		textAlignVertical: "top",
	},
})
