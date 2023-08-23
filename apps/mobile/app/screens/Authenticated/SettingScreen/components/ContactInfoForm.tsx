/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	ActivityIndicator,
} from "react-native"
import { PHONE_REGEX } from "../../../../helpers/regex"
import { translate } from "../../../../i18n"
import { IUser } from "../../../../services/interfaces/IUserData"
import { typography, useAppTheme } from "../../../../theme"
import { useUser } from "../../../../services/hooks/features/useUser"
import { IPopup } from ".."
import ConfirmEmailPopup from "./ConfirmEmailPopup"
import { debounce } from "lodash"
import validator from "validator"

interface IValidation {
	email: boolean
	phone: boolean
}
const UpdateContactForm = ({
	onDismiss,
	user,
	onUpdateContactInfo,
	onChangeSnap,
}: {
	onDismiss: () => unknown
	user: IUser
	onUpdateContactInfo: (userBody: IUser) => unknown
	onChangeSnap: (sheet: IPopup, snap: number) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const { allUsers, changeUserEmail } = useUser()
	const [userEmail, setUserEmail] = useState("")
	const [userPhoneNumber, setUserPhoneNumber] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [editMode, setEditMode] = useState(false)
	const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false)
	const [emailChanged, setEmailChanged] = useState(false)
	const [isValid, setIsvalid] = useState<IValidation>({
		email: true,
		phone: true,
	})

	useEffect(() => {
		if (user) {
			if (!editMode) {
				setUserEmail(user?.email)
				setUserPhoneNumber(user?.phoneNumber)
			}
		}
		setIsvalid({ email: true, phone: true })
	}, [user, onDismiss, editMode])

	const debouncedUpdateIsValid = debounce(
		(field: keyof IValidation, value: string, validatorFn: (value: string) => boolean) => {
			setIsvalid((prevState) => ({
				...prevState,
				[field]: validatorFn(value),
			}))
		},
		500,
	)

	const onChangeEmail = (text: string) => {
		setUserEmail(text)
		debouncedUpdateIsValid("email", text, validator.isEmail) // Use email-validator's validate function
	}

	const onChangePhoneNumber = (text: string) => {
		setUserPhoneNumber(text)
		debouncedUpdateIsValid("phone", text, (value) => value.trim().match(PHONE_REGEX) !== null)
	}

	const handleSubmit = async () => {
		if (!validator.isEmail(userEmail)) {
			setIsvalid({
				...isValid,
				email: false,
			})
			return
		}

		if (userPhoneNumber?.trim().length > 0 && !userPhoneNumber?.trim().match(PHONE_REGEX)) {
			setIsvalid({
				...isValid,
				phone: false,
			})
			return
		} else {
			if (userEmail === user?.email) {
				setIsLoading(true)
				await onUpdateContactInfo({
					...user,
					phoneNumber: userPhoneNumber,
				})
				setIsLoading(false)
				onDismiss()
			}
		}
		const emailExist = allUsers?.find((u) => u.email === userEmail && u.email !== user?.email)

		if (userEmail !== user?.email && !emailExist) {
			setEmailChanged(true)
			onChangeSnap("Contact", 4)
		}

		if (userEmail.trim() === user?.email && userPhoneNumber?.trim() === user?.phoneNumber) {
			onDismiss()
		}
	}

	const onSaveNewEmail = async () => {
		if (validator.isEmail(userEmail) && userEmail !== user?.email) {
			if (userPhoneNumber !== user?.phoneNumber) {
				await onUpdateContactInfo({
					...user,
					phoneNumber: userPhoneNumber,
				})
			}

			await changeUserEmail(userEmail)
				.then(() => {
					setShowConfirmPopup(true)
					onDismiss()
				})
				.catch((e) => console.log(JSON.stringify(e)))
		}
	}

	const onChangeEmailCancelled = () => {
		setEmailChanged(false)
		onChangeSnap("Contact", 0)
	}

	const onDismissPopup = () => {
		setShowConfirmPopup(false)
		setEditMode(false)
		setEmailChanged(false)
	}

	if (emailChanged) {
		return (
			<View
				style={{
					backgroundColor: dark ? "#1E2025" : colors.background,
					paddingHorizontal: 25,
					paddingTop: 26,
					paddingBottom: 40,
					height: 276,
				}}
			>
				<ConfirmEmailPopup
					newEmail={userEmail}
					visible={showConfirmPopup}
					onDismiss={() => onDismissPopup()}
				/>
				<View style={{ flex: 3 }}>
					<Text style={{ ...styles.formTitle, color: colors.primary }}>
						{"Change to new email?"}
					</Text>
					<TextInput
						style={{
							...styles.styleInput,
							color: colors.primary,
							borderColor: isValid.email ? "#DCE4E8" : "red",
							backgroundColor: !editMode ? colors.secondary2 : null,
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
				</View>

				<View style={styles.wrapButtons}>
					<TouchableOpacity style={styles.cancelBtn} onPress={() => onChangeEmailCancelled()}>
						<Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={{
							...styles.createBtn,
							backgroundColor: dark ? "#6755C9" : "#3826A6",
							opacity: isLoading ? 0.7 : 1,
						}}
						onPress={() => onSaveNewEmail()}
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
						backgroundColor: !editMode ? colors.secondary2 : null,
					}}
					placeholderTextColor={"#7B8089"}
					placeholder={translate("settingScreen.contact.emailPlaceholder")}
					value={userEmail}
					editable={editMode}
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
						backgroundColor: !editMode ? colors.secondary2 : null,
					}}
					placeholderTextColor={"#7B8089"}
					placeholder={translate("settingScreen.contact.phonePlaceholder")}
					value={userPhoneNumber}
					autoCorrect={false}
					autoComplete={"off"}
					keyboardType="phone-pad"
					editable={editMode}
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
				<TouchableOpacity
					style={styles.cancelBtn}
					onPress={() => {
						setEditMode(false)
						setEmailChanged(false)
						onDismiss()
					}}
				>
					<Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: isLoading ? 0.7 : 1,
					}}
					onPress={() => (editMode ? handleSubmit() : setEditMode(true))}
				>
					{isLoading ? (
						<ActivityIndicator
							style={{ position: "absolute", left: 10 }}
							size={"small"}
							color={"#fff"}
						/>
					) : null}
					<Text style={styles.createTxt}>
						{editMode ? translate("common.save") : translate("common.edit")}
					</Text>
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
