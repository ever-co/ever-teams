/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import {
	View,
	Text,
	Modal,
	TouchableWithoutFeedback,
	Animated,
	ViewStyle,
	StyleSheet,
} from "react-native"
import React from "react"
import { BlurView } from "expo-blur"

interface IChangeRoleModal {
	onDismiss: () => void
	visible: boolean
}

const ChangeRoleModal: React.FC<IChangeRoleModal> = ({ onDismiss, visible }) => {
	return (
		<ModalPopUp onDismiss={onDismiss} visible={visible}>
			<View style={styles.container}>
				<Text>ChangeRoleModal</Text>
			</View>
		</ModalPopUp>
	)
}

export default ChangeRoleModal

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
			<TouchableWithoutFeedback onPress={onDismiss}>
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
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: "90%",
	},
})
