/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import {
	StyleSheet,
	Text,
	View,
	Modal,
	TouchableWithoutFeedback,
	ViewStyle,
	Animated,
	TouchableOpacity,
} from "react-native"
import React, { FC } from "react"
import { typography, useAppTheme } from "../theme"
import { translate } from "../i18n"
import { BlurView } from "expo-blur"

interface IConfirmation {
	onDismiss: () => void
	visible: boolean
	onConfirm: () => void
	confirmationText: string
}

const ConfirmationModal: FC<IConfirmation> = ({
	onDismiss,
	visible,
	onConfirm,
	confirmationText,
}) => {
	const { colors } = useAppTheme()
	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.container, { backgroundColor: colors.background2 }]}>
				<Text style={{ color: colors.primary, fontSize: 17, textAlign: "center" }}>
					{confirmationText}
				</Text>
				<View style={styles.wrapButtons}>
					<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
						<Text style={styles.cancelTxt}>
							{translate("settingScreen.statusScreen.cancelButtonText")}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={{
							...styles.confirmBtn,
						}}
						onPress={() => {
							onConfirm()
							onDismiss()
						}}
					>
						<Text style={styles.confirmTxt}>Delete</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ModalPopUp>
	)
}

const ModalPopUp = ({ visible, children }) => {
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
			<TouchableWithoutFeedback>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

export default ConfirmationModal

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	cancelBtn: {
		alignItems: "center",
		backgroundColor: "#E6E6E9",
		borderRadius: 12,
		height: 56,
		justifyContent: "center",
		width: "48%",
	},
	cancelTxt: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 17,
	},
	confirmBtn: {
		alignItems: "center",
		backgroundColor: "#DA5E5E",
		borderRadius: 12,
		height: 56,
		justifyContent: "center",
		width: "48%",
	},
	confirmTxt: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 17,
	},
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "90%",
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
		width: "100%",
	},
})
