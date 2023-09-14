/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	StyleSheet,
	Animated,
	Dimensions,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
} from "react-native"
import { ActivityIndicator, Text } from "react-native-paper"
// COMPONENTS
// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, typography, useAppTheme } from "../../../../theme"
// import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"
import { translate } from "../../../../i18n"
import { CodeInput } from "../../../../components/CodeInput"

// import useTeamScreenLogic from "../logics/useTeamScreenLogic"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
	isLoading: boolean
	verifyEmailByCode: (email: string, code: string) => void
	resendAccountVerificationCode: () => void
	userEmail: string
}
const { width } = Dimensions.get("window")

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
		<Modal transparent visible={showModal}>
			<KeyboardAvoidingView
				style={$modalBackGround}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

const VerifyAccountModal: FC<Props> = function InviteUserModal({
	visible,
	onDismiss,
	isLoading,
	verifyEmailByCode,
	resendAccountVerificationCode,
	userEmail,
}) {
	// const { inviterMember, loading } = useTeamInvitations()
	// const {
	// 	memberEmail,
	// 	memberName,
	// 	setErrors,
	// 	setMemberEmail,
	// 	setMemberName,
	// 	handleEmailInput,
	// 	handleNameInput,
	// 	emailsSuggest,
	// 	setEmailSuggests,
	// 	errors,
	// } = useTeamScreenLogic()
	const { colors, dark } = useAppTheme()
	const [verificationCode, setVerificationCode] = useState<string | null>(null)

	const notVerified = verificationCode?.length < 6 || verificationCode === null

	const onChangeVerificationCode = (code: string) => {
		setVerificationCode(code)
	}

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ width: "100%", marginBottom: 20 }}>
					<Text style={[styles.mainTitle, { color: colors.primary, textAlign: "center" }]}>
						{translate("loginScreen.inviteCodeFieldLabel")}
					</Text>
				</View>
				<View style={$container}>
					<CodeInput
						onChange={onChangeVerificationCode}
						editable={!isLoading}
						defaultValue={verificationCode}
					/>
					<View style={{ marginTop: 10, marginLeft: 4 }}>
						<Text style={styles.hint}>Didn't receive code?</Text>
						<TouchableOpacity onPress={resendAccountVerificationCode}>
							<Text style={[styles.hint, { color: dark ? "#8C7AE4" : "#3826A6" }]}>
								Resend code
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={{ width: "100%" }}>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => {
								onDismiss()
								setVerificationCode(null)
							}}
							style={[styles.button, { backgroundColor: "#E6E6E9" }]}
						>
							<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>
								{translate("common.cancel")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: "#3826A6", opacity: notVerified || isLoading ? 0.5 : 1 },
							]}
							disabled={notVerified || isLoading}
							onPress={() => {
								verifyEmailByCode(userEmail, verificationCode)
								onDismiss()
							}}
						>
							<Text style={styles.buttonText}>{translate("accountVerificationModal.verify")}</Text>
						</TouchableOpacity>
						<ActivityIndicator
							style={[styles.loading, { marginRight: 8 }]}
							animating={isLoading}
							size={"small"}
							color={"#fff"}
						/>
					</View>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default VerifyAccountModal

const $container: ViewStyle = {
	...GS.flex1,
	paddingTop: 20,
	// paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "rgba(0,0,0,0.5)",
	justifyContent: "flex-end",
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		borderRadius: 11,
		height: 57,
		justifyContent: "center",
		padding: 10,
		width: width / 2.5,
	},
	buttonText: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	hint: {
		color: "#7E7991",
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
	},
	loading: {
		bottom: "27%",
		position: "absolute",
		right: "31%",
	},
	mainContainer: {
		alignItems: "center",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		height: 330,
		paddingHorizontal: 20,
		paddingVertical: 30,
		width: "100%",
	},
	mainTitle: {
		color: colors.primary,
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},

	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 40,
	},
})
