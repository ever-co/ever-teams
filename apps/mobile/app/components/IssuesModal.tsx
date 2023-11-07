/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
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
import { useAppTheme } from "../theme"
import { BlurView } from "expo-blur"

interface IssuesModalProps {
	task: ITeamTask
	readonly?: boolean
	nameIncluded?: boolean
	smallFont?: boolean
}

const IssuesModal: FC<IssuesModalProps> = ({ task, readonly = false, nameIncluded, smallFont }) => {
	const { allTaskIssues } = useTaskIssue()
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
	const { updateTask } = useTeamTasks()
	const { colors } = useAppTheme()

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
		<View>
			<View
				style={[
					styles.wrapButton,
					{
						backgroundColor: currentIssue?.color,
						height: nameIncluded ? 24 : 20,
						width: nameIncluded ? 65 : 20,
						paddingVertical: nameIncluded && 2,
						paddingHorizontal: nameIncluded && 10,
						flexDirection: "row",
						alignItems: "center",
						gap: 2,
					},
				]}
				onTouchStart={() => {
					if (currentIssue.name !== "Epic" && !readonly) {
						setIsModalOpen(true)
					}
				}}
			>
				<SvgUri
					width={iconDimension}
					height={iconDimension}
					uri={currentIssue?.fullIconUrl}
				/>

				{nameIncluded && (
					<Text
						style={{
							color: "#ffffff",
							fontSize: smallFont ? 10 : 14,
						}}
					>
						{currentIssue?.name}
					</Text>
				)}
			</View>

			<ModalPopUp visible={isModalOpen} onDismiss={() => setIsModalOpen(false)}>
				<View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
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
		</View>
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
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: "absolute",
					width: "100%",
					height: "100%",
				}}
			/>
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
						{children}
					</Animated.View>
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
		width: 170,
	},
	wrapButton: {
		alignItems: "center",
		borderRadius: 3,
		justifyContent: "center",
	},
})
