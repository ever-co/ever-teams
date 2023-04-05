import React, { useEffect, useState } from "react"
import { AntDesign } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { useQueryClient } from "react-query"
import LanguageModal from "./LanguageModal"
import { ILanguageItemList, IUser } from "../../../../services/interfaces/IUserData"
import { useSettings } from "../../../../services/hooks/features/useSettings"
import { translate } from "../../../../i18n"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { typography, useAppTheme } from "../../../../theme"

const LanguageForm = ({
	onDismiss,
	user,
	onUpdateTimezone,
}: {
	onDismiss: () => unknown
	user: IUser
	onUpdateTimezone: (userBody: IUser) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const { preferredLanguage } = useSettings()
	const [userLanguage, setUserLanguage] = useState<ILanguageItemList>()
	const [isLoading, setIsLoading] = useState(false)
	const [languageModal, setLanguageModal] = useState(false)
	const queryClient = useQueryClient()

	useEffect(() => {
		setUserLanguage(preferredLanguage)
	}, [preferredLanguage])

	const handleSubmit = async () => {
		if (!userLanguage) {
			return
		}

		setIsLoading(true)
		await onUpdateTimezone({
			...user,
			preferredLanguage: userLanguage.code,
		})
		queryClient.invalidateQueries("Languages")
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
				height: 274,
				zIndex: 100,
			}}
		>
			<LanguageModal
				visible={languageModal}
				preferredLanguage={preferredLanguage}
				onDismiss={() => setLanguageModal(false)}
				onLanguageSelect={(e) => {
					setUserLanguage(e)
				}}
			/>
			<View style={{ flex: 2 }}>
				<Text style={{ ...styles.formTitle, color: colors.primary }}>
					{translate("settingScreen.changeLanguage.mainTitle")}
				</Text>
				<TouchableOpacity style={styles.field} onPress={() => setLanguageModal(true)}>
					<Text style={{ ...styles.text, color: colors.primary }}>
						{limitTextCharaters({ text: userLanguage?.name, numChars: 17 })}
					</Text>
					<AntDesign name="down" size={20} color={colors.primary} />
				</TouchableOpacity>
			</View>

			<View style={styles.wrapButtons}>
				<TouchableOpacity
					style={styles.cancelBtn}
					onPress={() => {
						setUserLanguage(preferredLanguage)
						onDismiss()
					}}
				>
					<Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: isLoading || !userLanguage ? 0.5 : 1,
					}}
					onPress={() => (isLoading || !userLanguage ? {} : handleSubmit())}
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
	field: {
		alignItems: "center",
		borderColor: "#DCE4E8",
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: "row",
		height: 57,
		justifyContent: "space-between",
		marginTop: 16,
		paddingHorizontal: 20,
		width: "100%",
		zIndex: 1000,
	},
	formTitle: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 16,
	},
	wrapButtons: {
		flexDirection: "row",
		flex: 1,
		justifyContent: "space-between",
		marginTop: 40,
		width: "100%",
		zIndex: 100,
	},
})

export default LanguageForm
