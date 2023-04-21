/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import {
	View,
	Text,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	ActivityIndicator,
} from "react-native"
import { translate } from "../../../../i18n"
import { useStores } from "../../../../models"
import { IUser } from "../../../../services/interfaces/IUserData"
import { typography, useAppTheme } from "../../../../theme"

interface IValidation {
	firstname: boolean
	lastName: boolean
}
const UpdateFullNameForm = observer(
	({
		onDismiss,
		onUpdateFullName,
	}: {
		onDismiss: () => unknown
		onUpdateFullName: (userBody: IUser) => unknown
	}) => {
		const { colors, dark } = useAppTheme()
		const {
			authenticationStore: { user },
		} = useStores()
		const [userFirstName, setUserFirstName] = useState("")
		const [userLastName, setUserLastName] = useState("")
		const [isLoading, setIsLoading] = useState(false)
		const [isValid, setIsvalid] = useState<IValidation>({
			firstname: true,
			lastName: true,
		})

		useEffect(() => {
			if (user) {
				setUserFirstName(user?.firstName)
				setUserLastName(user?.lastName)
			}
		}, [user])

		const onChangeFistName = (text: string) => {
			if (text.trim().length > 2) {
				setIsvalid({
					...isValid,
					firstname: true,
				})
			} else {
				setIsvalid({
					...isValid,
					firstname: false,
				})
			}
			setUserFirstName(text)
		}

		const onChaneLastName = (text: string) => {
			if (text.trim().length > 2) {
				setIsvalid({
					...isValid,
					lastName: true,
				})
			} else {
				setIsvalid({
					...isValid,
					lastName: false,
				})
			}
			setUserLastName(text)
		}

		const handleSubmit = async () => {
			if (userFirstName.trim().length < 3) {
				setIsvalid({
					...isValid,
					firstname: false,
				})
				return
			}

			if (userLastName.trim().length < 3) {
				setIsvalid({
					...isValid,
					lastName: false,
				})
				return
			}

			if (userFirstName.trim() === user?.firstName && userLastName.trim() === user?.lastName) {
				return
			}

			setIsLoading(true)
			await onUpdateFullName({
				...user,
				firstName: userFirstName,
				lastName: userLastName,
			})
			setIsLoading(false)
			onDismiss()
		}

		return (
			<View
				style={{
					backgroundColor: colors.background,
					paddingHorizontal: 25,
					paddingTop: 26,
					paddingBottom: 40,
					height: 349,
				}}
			>
				<View style={{ flex: 3 }}>
					<Text style={{ ...styles.formTitle, color: colors.primary }}>
						{translate("settingScreen.changeFullName.mainTitle")}
					</Text>
					<TextInput
						style={{
							...styles.styleInput,
							color: colors.primary,
							borderColor: isValid.firstname ? "#DCE4E8" : "red",
						}}
						placeholderTextColor={"#7B8089"}
						placeholder={translate("settingScreen.changeFullName.firstNamePlaceholder")}
						value={userFirstName}
						editable={!isLoading}
						autoComplete={"off"}
						autoFocus={false}
						autoCorrect={false}
						autoCapitalize={"none"}
						onChangeText={(text) => onChangeFistName(text)}
					/>
					{!isValid.firstname ? (
						<Text
							style={{
								fontFamily: typography.primary.medium,
								fontSize: 12,
								color: "red",
								marginTop: 5,
							}}
						>
							Provide a valid last name
						</Text>
					) : null}

					<TextInput
						style={{
							...styles.styleInput,
							color: colors.primary,
							borderColor: isValid.lastName ? "#DCE4E8" : "red",
						}}
						placeholderTextColor={"#7B8089"}
						placeholder={translate("settingScreen.changeFullName.lastNamePlaholder")}
						value={userLastName}
						autoCorrect={false}
						autoComplete={"off"}
						editable={!isLoading}
						autoCapitalize={"none"}
						onChangeText={(text) => onChaneLastName(text)}
					/>
					{!isValid.lastName ? (
						<Text
							style={{
								fontFamily: typography.primary.medium,
								fontSize: 12,
								color: "red",
								marginTop: 5,
							}}
						>
							Provide a valid last name
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
	},
)

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

export default UpdateFullNameForm
