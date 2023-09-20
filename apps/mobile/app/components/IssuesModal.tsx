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
}

const IssuesModal: FC<IssuesModalProps> = ({ task }) => {
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

	return (
		<>
			<View
				style={[styles.wrapButton, { backgroundColor: currentIssue?.color }]}
				onTouchStart={() => {
					console.log(allTaskIssues)
					setIsModalOpen(true)
				}}
			>
				<SvgUri width={15} height={15} uri={currentIssue?.fullIconUrl} />
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
}

const Item = ({ issue, onChangeIssue, closeModal }: IItem) => {
	return (
		<TouchableOpacity
			onPress={() => {
				onChangeIssue(issue.name)
				closeModal()
			}}
		>
			<View
				style={{
					backgroundColor: issue.color,
					padding: 20,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					flexDirection: "row",
					borderRadius: 10,
					marginVertical: 7,
				}}
			>
				<SvgUri width={20} height={20} uri={issue.fullIconUrl} />
				<Text style={{ fontSize: 22, marginHorizontal: 8, color: "#FFFF" }}>{issue.name}</Text>
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
	modalContainer: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		height: "auto",
		padding: 20,
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
