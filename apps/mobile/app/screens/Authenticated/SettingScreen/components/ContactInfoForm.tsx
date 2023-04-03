import React, { useEffect, useState } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	ActivityIndicator,
} from "react-native"
import { EMAIL_REGEX, PHONE_REGEX } from "../../../../helpers/regex"
import { translate } from "../../../../i18n"
import { IUser } from "../../../../services/interfaces/IUserData"
import { typography, useAppTheme } from "../../../../theme"

interface IValidation {
	email: boolean
	phone: boolean
}
const UpdateContactForm = ({
	onDismiss,
	user,
	onUpdateContactInfo,
}: {
	onDismiss: () => unknown
	user: IUser
	onUpdateContactInfo: (userBody: IUser) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const [userEmail, setUserEmail] = useState("")
	const [userPhoneNumber, setUserPhoneNumber] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [isValid, setIsvalid] = useState<IValidation>({
		email: true,
		phone: true,
	})

	useEffect(() => {
		if (user) {
			setUserEmail(user?.email)
			setUserPhoneNumber(user?.phoneNumber)
		}
		setIsvalid({ email: true, phone: true })
	}, [user, onDismiss])

	const onChangeEmail = (text: string) => {
		if (text.trim().match(EMAIL_REGEX)) {
			setIsvalid({
				...isValid,
				email: true,
			})
		} else {
			setIsvalid({
				...isValid,
				email: false,
			})
		}
		setUserEmail(text)
	}

	const onChangePhoneNumber = (text: string) => {
		if (text.trim().match(PHONE_REGEX)) {
			setIsvalid({
				...isValid,
				phone: true,
			})
		} else {
			setIsvalid({
				...isValid,
				phone: false,
			})
		}
		setUserPhoneNumber(text)
	}

	const handleSubmit = async () => {
		if (!userEmail.trim().match(EMAIL_REGEX)) {
			setIsvalid({
				...isValid,
				email: false,
			})
			return
		}

		if (!userPhoneNumber.trim().match(PHONE_REGEX)) {
			setIsvalid({
				...isValid,
				phone: false,
			})
			return
		}

		if (userEmail.trim() === user?.email && userPhoneNumber.trim() === user?.phoneNumber) {
			return
		}

		setIsLoading(true)
		await onUpdateContactInfo({
			...user,
			email: userEmail,
			phoneNumber: userPhoneNumber,
		})
		setIsLoading(false)
		onDismiss()
	}

	return (
		<View
			style={{
				backgroundColor: dark ? "#1E2025" : colors.background,
				paddingHorizontal: 25,
				paddingTop: 26,
				paddingBottom: 40,
				height: 349,
			}}
		>
			<View style={{ flex: 3 }}>
				<Text style={{ ...styles.formTitle, color: colors.primary }}>
					{translate("settingScreen.contact.mainTitle")}
				</Text>
				<TextInput
					style={{
						...styles.styleInput,
						color: colors.primary,
						borderColor: isValid.email ? "#DCE4E8" : "red",
					}}
					placeholderTextColor={"#7B8089"}
					placeholder={translate("settingScreen.contact.emailPlaceholder")}
					value={userEmail}
					editable={!isLoading}
					autoComplete={"off"}
					keyboardType="email-address"
					autoFocus={false}
					autoCorrect={false}
					autoCapitalize={"none"}
					onChangeText={(text) => onChangeEmail(text)}
				/>
				{!isValid.email ? (
					<Text
						style={{
							fontFamily: typography.primary.medium,
							fontSize: 12,
							color: "red",
							marginTop: 5,
						}}
					>
						{translate("settingScreen.contact.emailNotValid")}
					</Text>
				) : null}

				<TextInput
					style={{
						...styles.styleInput,
						color: colors.primary,
						borderColor: isValid.phone ? "#DCE4E8" : "red",
					}}
					placeholderTextColor={"#7B8089"}
					placeholder={translate("settingScreen.contact.phonePlaceholder")}
					value={userPhoneNumber}
					autoCorrect={false}
					autoComplete={"off"}
					keyboardType="phone-pad"
					editable={!isLoading}
					autoCapitalize={"none"}
					onChangeText={(text) => onChangePhoneNumber(text)}
				/>
				{!isValid.phone ? (
					<Text
						style={{
							fontFamily: typography.primary.medium,
							fontSize: 12,
							color: "red",
							marginTop: 5,
						}}
					>
						{translate("settingScreen.contact.phoneNotValid")}
					</Text>
				) : null}
			</View>

			<View style={styles.wrapButtons}>
				<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
					<Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: isLoading ? 0.7 : 1,
					}}
					onPress={() => handleSubmit()}
				>
					{isLoading ? (
						<ActivityIndicator
							style={{ position: "absolute", left: 10 }}
							size={"small"}
							color={"#fff"}
						/>
					) : null}
					<Text style={styles.createTxt}>{translate("common.save")}</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	cancelBtn: {
		alignItems: "center",
		backgroundColor: "#E6E6E9",
		borderRadius: 12,
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	cancelTxt: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	createBtn: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderRadius: 12,
		flexDirection: "row",
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	createTxt: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	formTitle: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	styleInput: {
		alignItems: "center",
		borderColor: "#DCE4E8",
		borderRadius: 12,
		borderWidth: 1,
		fontFamily: typography.primary.medium,
		fontSize: 16,
		height: 57,
		marginTop: 16,
		paddingHorizontal: 18,
		width: "100%",
	},
	wrapButtons: {
		flexDirection: "row",
		flex: 1,
		justifyContent: "space-between",
		marginTop: 40,
		width: "100%",
	},
})

export default UpdateContactForm
