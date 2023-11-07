/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from "react"
import { BlurView } from "expo-blur"
import {
	Animated,
	Modal,
	TouchableWithoutFeedback,
	View,
	Text,
	ViewStyle,
	StyleSheet,
	FlatList,
	TouchableOpacity,
} from "react-native"
import { Feather, AntDesign } from "@expo/vector-icons"
import { useAppTheme } from "../theme"
import { ITeamTask } from "../services/interfaces/ITask"
import { formattedEpic } from "./TaskEpic"

interface ITaskEpicPopup {
	visible: boolean
	onDismiss: () => unknown
	onTaskSelect: (parentTask: ITeamTask | undefined) => Promise<void>
	epicsList: formattedEpic
	currentEpic: string
	teamTasks: ITeamTask[]
}

const TaskEpicPopup: React.FC<ITaskEpicPopup> = ({
	visible,
	onDismiss,
	onTaskSelect,
	epicsList,
	currentEpic,
	teamTasks,
}) => {
	const { colors } = useAppTheme()

	const allEpics = Object.values(epicsList)

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View style={{ ...styles.container, backgroundColor: colors.background }}>
				<FlatList
					data={allEpics}
					contentContainerStyle={{ paddingHorizontal: 10 }}
					renderItem={({ item }) => (
						<Item
							currentEpicId={currentEpic}
							onTaskSelect={onTaskSelect}
							epic={item}
							teamTasks={teamTasks}
							onDismiss={onDismiss}
						/>
					)}
					legacyImplementation={true}
					showsVerticalScrollIndicator={true}
					keyExtractor={(_, index) => index.toString()}
				/>
			</View>
		</ModalPopUp>
	)
}

export default TaskEpicPopup

interface ItemProps {
	currentEpicId: string
	onTaskSelect: (parentTask: ITeamTask | undefined) => Promise<void>
	epic: formattedEpic[keyof formattedEpic]
	teamTasks: ITeamTask[]
	onDismiss()
}
const Item: React.FC<ItemProps> = ({ currentEpicId, epic, onTaskSelect, teamTasks, onDismiss }) => {
	const { colors } = useAppTheme()
	const selected = epic.id === currentEpicId

	const epicTask = teamTasks.find((task) => task.id === epic.id)

	return (
		<TouchableOpacity
			onPress={() => {
				onTaskSelect(epicTask)
				onDismiss()
			}}
		>
			<View
				style={{
					...styles.wrapperItem,
					borderColor: colors.border,
				}}
			>
				<View style={{ ...styles.colorFrame, backgroundColor: "#FFFFFF" }}>
					{epic.icon}
					<Text>{epic.name}</Text>
				</View>
				<View>
					{!selected ? (
						<Feather name="circle" size={22} color={colors.divider} />
					) : (
						<AntDesign name="checkcircle" size={22} color="#27AE60" />
					)}
				</View>
			</View>
		</TouchableOpacity>
	)
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

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: "center",
}

const styles = StyleSheet.create({
	colorFrame: {
		alignItems: "center",
		borderRadius: 10,
		flexDirection: "row",
		gap: 5,
		height: 44,
		paddingLeft: 16,
		width: 180,
	},
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		maxHeight: 396,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: "80%",
	},
	wrapperItem: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
		padding: 2,
		paddingRight: 18,
		width: "100%",
	},
})
