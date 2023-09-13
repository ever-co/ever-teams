/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC } from "react"
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
import { Text } from "react-native-paper"
// COMPONENTS
// STYLES
import { CONSTANT_SIZE, GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography, useAppTheme } from "../../../../theme"
// import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"
import { translate } from "../../../../i18n"
// import useTeamScreenLogic from "../logics/useTeamScreenLogic"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
}
const { width, height } = Dimensions.get("window")

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

const VerifyAccountModal: FC<Props> = function InviteUserModal({ visible, onDismiss }) {
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
	const { colors } = useAppTheme()

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ width: "100%", marginBottom: 20 }}>
					<Text style={[styles.mainTitle, { color: colors.primary }]}>
						{translate("teamScreen.inviteModalTitle")}
					</Text>
					<Text style={styles.hint}>{translate("teamScreen.inviteModalHint")}</Text>
				</View>
				<View style={{ width: "100%" }}>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => onDismiss()}
							style={[styles.button, { backgroundColor: "#E6E6E9" }]}
						>
							<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>
								{translate("common.cancel")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.button, { backgroundColor: "#3826A6" }]}>
							<Text style={styles.buttonText}>{translate("teamScreen.sendButton")}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default VerifyAccountModal

const $container: ViewStyle = {
	...GS.flex1,
	paddingTop: spacing.extraLarge + spacing.large,
	paddingHorizontal: spacing.large,
}
const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "rgba(0,0,0,0.5)",
	justifyContent: "flex-end",
}
const $modalContainer: ViewStyle = {
	width: "100%",
	height,
	backgroundColor: "white",
	paddingHorizontal: 30,
	paddingVertical: 30,
	borderRadius: 30,
	elevation: 20,
	justifyContent: "center",
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

	// loading: {
	// 	bottom: "12%",
	// 	left: "15%",
	// 	position: "absolute",
	// },
	mainContainer: {
		alignItems: "center",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		height: 374,
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
