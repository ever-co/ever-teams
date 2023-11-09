/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import {
	View,
	Text,
	TouchableWithoutFeedback,
	Animated,
	Modal,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
} from "react-native"
import React, { useState } from "react"
import { BlurView } from "expo-blur"
import { ActionTypeItem } from "./TaskLinkedIssue"
import { useAppTheme } from "../../../../theme"
import { AntDesign } from "@expo/vector-icons"

interface IActionTypesModal {
	actionType: ActionTypeItem
	actionItems: ActionTypeItem[]
	onChange: (item: ActionTypeItem) => void
}

const ActionTypesModal: React.FC<IActionTypesModal> = ({ actionType, actionItems, onChange }) => {
	const [modalOpen, setModalOpen] = useState<boolean>(false)

	const { colors } = useAppTheme()

	return (
		<View>
			<TouchableOpacity
				style={[styles.button, { borderColor: colors.border }]}
				onPress={() => setModalOpen(true)}
			>
				<Text style={{ fontSize: 8, fontWeight: "600", color: colors.primary }}>
					{actionType.data.name}
				</Text>
				<AntDesign name="down" size={8} color={colors.primary} style={{ margin: 0 }} />
			</TouchableOpacity>

			<ModalPopUp visible={modalOpen} onDismiss={() => setModalOpen(false)}>
				<View style={styles.container}>
					{actionItems.map((actionItem, idx) => (
						<Item key={idx} actionItem={actionItem} onChange={onChange} />
					))}
				</View>
			</ModalPopUp>
		</View>
	)
}

export default ActionTypesModal

interface IItem {
	actionItem: ActionTypeItem
	onChange: (item: ActionTypeItem) => void
}

const Item: React.FC<IItem> = ({ actionItem, onChange }) => {
	const { colors } = useAppTheme()
	return (
		<View>
			<TouchableOpacity
				style={{
					padding: 10,
					borderWidth: 1,
					borderColor: colors.border,
					borderRadius: 10,
				}}
				onPress={() => onChange(actionItem)}
			>
				<Text>{actionItem.data.name}</Text>
			</TouchableOpacity>
		</View>
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
	button: {
		alignItems: "center",
		borderRadius: 3,
		borderWidth: 1,
		flexDirection: "row",
		gap: 5,
		height: 20,
		justifyContent: "space-between",
		paddingHorizontal: 7,
		paddingVertical: 4,
	},
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		gap: 5,
		maxHeight: 396,
		padding: 10,
		width: "50%",
	},
})
