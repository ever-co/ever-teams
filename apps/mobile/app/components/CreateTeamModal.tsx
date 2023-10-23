/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
	KeyboardAvoidingView,
	Platform,
} from "react-native"

// COMPONENTS
import { Text } from "."
// STYLES
import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { typography, useAppTheme } from "../theme"
import { TextInput } from "react-native-gesture-handler"
import { translate } from "../i18n"
import { BlurView } from "expo-blur"

export interface Props {
	visible: boolean
	onCreateTeam: (value: string) => unknown
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
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: "absolute",
					width: "100%",
					height: "100%",
				}}
			/>
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

const CreateTeamModal: FC<Props> = function CreateTeamModal({ visible, onDismiss, onCreateTeam }) {
	const { colors } = useAppTheme()
	const [teamText, setTeamText] = useState("")

	const handleSubmit = () => {
		onCreateTeam(teamText)
		setTeamText("")
		onDismiss()
	}

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ ...GS.w100 }}>
					<Text style={[styles.mainTitle, { color: colors.primary }]}>
						{"Enter new team name"}
					</Text>
					<View>
						<TextInput
							placeholderTextColor={colors.tertiary}
							autoCapitalize={"none"}
							autoCorrect={false}
							value={teamText}
							style={[
								styles.textInput,
								{ borderColor: colors.border, color: colors.primary },
							]}
							placeholder={"Please enter your team name"}
							onChangeText={(text) => setTeamText(text)}
						/>
						<Text style={[styles.hint, { color: "red" }]}>{""}</Text>
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
								{
									backgroundColor: "#3826A6",
									opacity: teamText.trim().length < 3 ? 0.5 : 1,
								},
							]}
							disabled={teamText.trim().length < 3}
							onPress={() => handleSubmit()}
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

export default CreateTeamModal

const $modalBackGround: ViewStyle = {
	flex: 1,
	// backgroundColor: "rgba(0,0,0,0.5)",
	justifyContent: "flex-end",
}
const $modalContainer: ViewStyle = {
	height,

	justifyContent: "flex-end",
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		borderRadius: 11,
		height: height / 16,
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
		borderColor: "#1B005D0D",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		borderWidth: 2,
		height: height / 3,
		paddingHorizontal: 20,
		paddingVertical: 30,
		shadowColor: "#1B005D0D",
		shadowOffset: { width: 10, height: 10 },
		shadowRadius: 10,
		width: "100%",
	},
	mainTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		marginBottom: 20,
	},
	textInput: {
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 10,
		borderWidth: 1,
		fontSize: 16,
		fontWeight: "600",
		height: 53,
		paddingHorizontal: 13,
		width: "100%",
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 30,
	},
})
