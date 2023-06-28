/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useCallback, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Text,
	Animated,
	StyleSheet,
	TouchableWithoutFeedback,
	TouchableOpacity,
} from "react-native"
import { typography, useAppTheme } from "../../../../theme"
import { CodeInput } from "../../../../components/CodeInput"
import { Button } from "../../../../components"
import { translate } from "../../../../i18n"
import { useUser } from "../../../../services/hooks/features/useUser"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
	newEmail: string
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
			<TouchableWithoutFeedback>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const ConfirmEmailPopup: FC<Props> = function ConfirmEmailPopup({ visible, onDismiss, newEmail }) {
	const { colors, dark } = useAppTheme()
	const { resendVerifyCode, verifyChangeEmail } = useUser()
	const [confirmCode, setConfirmCode] = useState("")
	const [error, setError] = useState("")

	const onVerifyEmail = useCallback(() => {
		if (parseInt(confirmCode) && confirmCode.length === 6) {
			verifyChangeEmail(confirmCode)
				.then((e) => {
					const { response } = e
					if (response.ok && response.status === 202) {
						onDismiss()
					} else {
						setError("Invalid code")
					}
				})
				.catch((e) => console.log(e))
		}
	}, [])

	return (
		<ModalPopUp visible={visible}>
			<View style={{ ...styles.container, backgroundColor: colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>Security Code</Text>
				<CodeInput onChange={setConfirmCode} editable={true} />
				<Text style={{ ...styles.text, marginTop: 10 }}>Security code was sent on new email</Text>
				<View style={styles.wrapResendText}>
					<Text style={styles.text}>{translate("loginScreen.codeNotReceived")}</Text>
					<TouchableOpacity onPress={() => resendVerifyCode(newEmail)}>
						<Text>{translate("loginScreen.sendCode")}</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.wrapButtons}>
					<Button style={styles.btnStyle} onPress={() => onDismiss()}>
						<Text style={{ ...styles.btnTxt, color: colors.primary }}>
							{translate("common.cancel")}
						</Text>
					</Button>
					<Button
						style={{ ...styles.btnStyle, backgroundColor: dark ? "#6755C9" : "#3826A6" }}
						onPress={() => onVerifyEmail()}
					>
						<Text style={{ ...styles.btnTxt, color: colors.background }}>Confirm</Text>
					</Button>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default ConfirmEmailPopup

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	btnStyle: {
		borderRadius: 7,
		paddingVertical: 10,
		width: "45%",
	},
	btnTxt: {
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
	},
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		height: 306,
		padding: 24,
		width: "90%",
	},
	text: {
		color: "#B1AEBC",
		fontSize: 14,
		marginBottom: 24,
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		marginBottom: 32,
		textAlign: "center",
		width: "100%",
	},
	wrapButtons: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	wrapResendText: {
		flexDirection: "row",
		width: "100%",
	},
})
