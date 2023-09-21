/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from "react"
import {
	Text,
	View,
	StyleSheet,
	FlatList,
	Animated,
	Modal,
	ViewStyle,
	TouchableWithoutFeedback,
	TouchableOpacity,
} from "react-native"
import { useTaskIssue } from "../services/hooks/features/useTaskIssue"
import { ITeamTask } from "../services/interfaces/ITask"
import { SvgUri } from "react-native-svg"
import { IIssueType } from "../services/interfaces/ITaskIssue"
import { useTeamTasks } from "../services/hooks/features/useTeamTasks"

interface IssuesModalProps {
	task: ITeamTask
	readonly?: boolean
}

const IssuesModal: FC<IssuesModalProps> = ({ task, readonly = false }) => {
	const { allTaskIssues } = useTaskIssue()
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
	const { updateTask } = useTeamTasks()

	const currentIssue = task?.issueType
		? allTaskIssues.find((issue) => issue.name === task?.issueType)
		: allTaskIssues.find((issue) => issue.name === "Task")

	const onChangeIssue = async (text) => {
		if (task) {
			const taskEdit = {
				...task,
				issueType: text,
			}

			await updateTask(taskEdit, task.id)
		}
	}

	const iconDimension: number =
		currentIssue?.name === "Bug" ? 15 : currentIssue?.name === "Story" ? 14 : 13

	return (
		<>
			<View
				style={[styles.wrapButton, { backgroundColor: currentIssue?.color }]}
				onTouchStart={() => {
					!readonly && setIsModalOpen(true)
				}}
			>
				<SvgUri width={iconDimension} height={iconDimension} uri={currentIssue?.fullIconUrl} />
			</View>

			<ModalPopUp visible={isModalOpen} onDismiss={() => setIsModalOpen(false)}>
				<View style={styles.modalContainer}>
					<FlatList
						data={allTaskIssues}
						renderItem={({ item }) => (
							<Item
								onChangeIssue={onChangeIssue}
								issue={item}
								closeModal={() => setIsModalOpen(false)}
								readonly={readonly}
							/>
						)}
					/>
				</View>
			</ModalPopUp>
		</>
	)
}

export default IssuesModal

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
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

interface IItem {
	issue: IIssueType
	onChangeIssue: (text: string) => void
	closeModal: () => void
	readonly?: boolean
}

const Item = ({ issue, onChangeIssue, closeModal, readonly = false }: IItem) => {
	return (
		<TouchableOpacity
			onPress={() => {
				onChangeIssue(issue.name)
				closeModal()
			}}
			activeOpacity={readonly ? 1 : 0.2}
		>
			<View
				style={[
					styles.issueContainer,
					{
						backgroundColor: issue.color,
					},
				]}
			>
				<SvgUri width={20} height={20} uri={issue.fullIconUrl} />
				<Text style={styles.issueText}>{issue.name}</Text>
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
	issueContainer: {
		alignItems: "center",
		borderRadius: 10,
		display: "flex",
		flexDirection: "row",
		justifyContent: "flex-start",
		marginVertical: 7,
		paddingHorizontal: 25,
		paddingVertical: 20,
	},
	issueText: { color: "#FFFF", fontSize: 22, marginHorizontal: 8 },
	modalContainer: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		height: "auto",
		padding: 22,
		width: "40%",
	},
	wrapButton: {
		alignItems: "center",
		borderRadius: 3,
		height: 20,
		justifyContent: "center",
		width: 20,
	},
})
