/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useEffect } from "react"
import {
	View,
	ViewStyle,
	Modal,
	StyleSheet,
	TextInput,
	Animated,
	Dimensions,
	TouchableOpacity,
	FlatList,
	KeyboardAvoidingView,
	Platform,
} from "react-native"
import { Text } from "react-native-paper"
// COMPONENTS
// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, typography, useAppTheme } from "../../../../theme"
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"
import { translate } from "../../../../i18n"
import useTeamScreenLogic from "../logics/useTeamScreenLogic"

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
				<Animated.View style={[$modalContainer, { transform: [{ scale: scaleValue }] }]}>
					{children}
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

const InviteUserModal: FC<Props> = function InviteUserModal({ visible, onDismiss }) {
	const { inviterMember } = useTeamInvitations()
	const {
		memberEmail,
		memberName,
		setErrors,
		setMemberEmail,
		setMemberName,
		handleEmailInput,
		handleNameInput,
		emailsSuggest,
		setEmailSuggests,
		errors,
	} = useTeamScreenLogic()
	const { colors } = useAppTheme()

	const handleSubmit = async () => {
		await inviterMember({ email: memberEmail, name: memberName })
		setMemberEmail("")
		setMemberName("")
		onDismiss()
	}

	useEffect(() => {
		setErrors({
			emailError: null,
			nameError: null,
		})
		setMemberEmail("")
		setMemberName("")
		setEmailSuggests([])
	}, [])

	const renderEmailCompletions = (emails: string[]) => (
		<View
			style={{
				position: "absolute",
				bottom: 62,
				width: "85%",
				maxHeight: 200,
				paddingVertical: 5,
				borderRadius: 10,
				backgroundColor: colors.background,
				...GS.shadow,
				zIndex: 1000,
			}}
		>
			<FlatList
				data={emails}
				keyExtractor={(item, index) => index.toString()}
				renderItem={({ item }) => (
					<TouchableOpacity onPress={() => handleEmailInput(item)}>
						<View
							style={{
								width: "100%",
								paddingVertical: 5,
								paddingHorizontal: 16,
							}}
						>
							<Text
								style={{
									color: colors.primary,
									fontFamily: typography.primary.bold,
									fontSize: 14,
								}}
							>
								{memberEmail}
								<Text style={{ color: "#B1AEBC" }}>
									{item.replace(memberEmail, "")}
								</Text>
							</Text>
						</View>
					</TouchableOpacity>
				)}
				extraData={emailsSuggest}
			/>
		</View>
	)
	const canSubmit =
		memberEmail.trim().length > 0 &&
		memberName.trim().length > 0 &&
		!errors.emailError &&
		!errors.nameError
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
					<View>
						{emailsSuggest.length > 0 && renderEmailCompletions(emailsSuggest)}
						<TextInput
							placeholderTextColor={colors.tertiary}
							style={[
								styles.textInput,
								{ borderColor: colors.border, color: colors.primary },
							]}
							autoCapitalize={"none"}
							keyboardType="email-address"
							value={memberEmail}
							autoCorrect={false}
							placeholder={translate("teamScreen.inviteEmailFieldPlaceholder")}
							onChangeText={(text) => handleEmailInput(text)}
						/>
						<Text style={[styles.hint, { color: "red" }]}>{errors.emailError}</Text>
					</View>
					<View>
						<TextInput
							placeholderTextColor={colors.tertiary}
							autoCapitalize={"none"}
							autoCorrect={false}
							style={[
								styles.textInput,
								{
									marginTop: 16,
									borderColor: colors.border,
									color: colors.primary,
								},
							]}
							placeholder={translate("teamScreen.inviteNameFieldPlaceholder")}
							onChangeText={(text) => handleNameInput(text)}
						/>
						<Text style={[styles.hint, { color: "red" }]}>{errors.nameError}</Text>
					</View>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => onDismiss()}
							style={[styles.button, { backgroundColor: "#E6E6E9" }]}
						>
							<Text style={[styles.buttonText, { color: "#1A1C1E" }]}>
								{translate("common.cancel")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: "#3826A6", opacity: !canSubmit ? 0.3 : 1 },
							]}
							onPress={() => (canSubmit ? handleSubmit() : {})}
						>
							<Text style={styles.buttonText}>
								{translate("teamScreen.sendButton")}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default InviteUserModal

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "rgba(0,0,0,0.5)",
	justifyContent: "flex-end",
}
const $modalContainer: ViewStyle = {
	height,
	backgroundColor: "rgba(0,0,0,0.6)",
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
	textInput: {
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 10,
		borderWidth: 1,
		color: colors.primary,
		height: 45,
		paddingHorizontal: 13,
		width: "100%",
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 40,
	},
})
