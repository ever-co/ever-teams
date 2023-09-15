/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from "react"
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	Dimensions,
	FlatList,
} from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"
import { useAppTheme, typography } from "../../../../theme"
import TaskLabelPopup from "../../../../components/TaskLabelPopup"
import { ITaskLabelItem } from "../../../../services/interfaces/ITaskLabel"
import { translate } from "../../../../i18n"
import { useTaskLabelValue } from "../../../../components/StatusType"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { SvgUri } from "react-native-svg"

interface TaskLabelProps {
	task?: ITeamTask
	containerStyle?: ViewStyle
	labels?: string
	setLabels?: (label: string) => unknown
}

interface IndividualTaskLabel {
	color: string
	createdAt: string
	description: string | null
	fullIconUrl: string
	icon: string
	id: string
	isSystem: boolean
	name: string
	organizationId: string
	organizationTeamId: string
	tenantId: string
	updatedAt: string
}

const TaskLabels: FC<TaskLabelProps> = observer(({ task, containerStyle, labels, setLabels }) => {
	const { colors } = useAppTheme()
	const { updateTask } = useTeamTasks()
	const [openModal, setOpenModal] = useState(false)

	const allTaskLabels = useTaskLabelValue()
	const label = task && task.tags?.length > 1 ? (task?.tags[0] as ITaskLabelItem) : null

	const currentLabel =
		allTaskLabels[task ? label?.name.split("-").join(" ") : labels?.split("-").join(" ")]

	const onChangeLabel = async (text: ITaskLabelItem) => {
		if (task) {
			let tags = []
			const exist = task?.tags.find((label) => label.id === text.id)
			if (exist) {
				tags = task.tags.filter((label) => label.id !== text.id)
			} else {
				tags = [...task.tags, text]
			}
			const taskEdit = {
				...task,
				tags,
			}
			await updateTask(taskEdit, task.id)
		} else {
			setLabels(text.name?.split("-").join(" "))
		}
	}

	return (
		<>
			<TaskLabelPopup
				labelNames={task?.tags}
				visible={openModal}
				setSelectedLabel={(e) => onChangeLabel(e)}
				onDismiss={() => setOpenModal(false)}
			/>
			{/* <TouchableOpacity
				onPress={() => {
					setOpenModal(true)
					labelsLog()
				}}
			>
				<View
					style={{
						...styles.container,
						...containerStyle,
						borderColor: colors.border,
						backgroundColor: currentLabel?.bgColor,
					}}
				>
					{currentLabel ? (
						<View style={styles.wrapStatus}>
							{currentLabel.icon}
							<Text style={{ ...styles.text, marginLeft: 10 }}>
								{limitTextCharaters({ text: currentLabel.name, numChars: 15 })}
							</Text>
						</View>
					) : (
						<View style={styles.wrapStatus}>
							<Entypo name="circle" size={12} color={colors.primary} />
							<Text style={{ ...styles.text, color: colors.primary, marginLeft: 5 }}></Text>
							<Text style={{ ...styles.text, color: colors.primary }}>
								{translate("settingScreen.labelScreen.labels")}
							</Text>
						</View>
					)}
					<AntDesign name="down" size={14} color={colors.primary} />
				</View>
			</TouchableOpacity> */}
			<View>
				<FlatList
					data={task?.tags}
					renderItem={({ item }) => <Label item={item} setOpenModal={setOpenModal} />}
					horizontal={true}
					keyExtractor={(_, index) => index.toString()}
					showsHorizontalScrollIndicator={false}
					ItemSeparatorComponent={() => (
						<View style={{ width: 10, backgroundColor: "transparent" }}></View>
					)}
				/>
			</View>
		</>
	)
})

interface ILabel {
	item: IndividualTaskLabel | null
	setOpenModal: React.Dispatch<React.SetStateAction<boolean>>
}

const Label: FC<ILabel> = ({ item, setOpenModal }) => {
	const { colors } = useAppTheme()
	return (
		<TouchableOpacity style={{}} onPress={() => setOpenModal(true)}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					backgroundColor: item?.color,
					marginVertical: 20,
					height: 32,
					minWidth: 100,
					maxWidth: 120,
					borderRadius: 10,
					borderColor: colors.border,
					borderWidth: 1,
					paddingHorizontal: 8,
				}}
			>
				<SvgUri width={10} height={10} uri={item?.fullIconUrl} />
				<Text
					style={{
						color: "#292D32",
						left: 5,
						fontSize: 10,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						marginLeft: 10,
					}}
				>
					{limitTextCharaters({ text: item?.name, numChars: 12 })}
				</Text>
			</View>
		</TouchableOpacity>
	)
}
const { width } = Dimensions.get("window")
const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0, 0, 0, 0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 32,
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 7,
		width: width / 3,
	},
	text: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
	},
	wrapStatus: {
		alignItems: "center",
		flexDirection: "row",
		width: "70%",
	},
})

export default TaskLabels
