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
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { typography, useAppTheme } from "../../../../theme"

const ChangeTeamName = observer(({ onDismiss }: { onDismiss: () => unknown }) => {
	const { colors, dark } = useAppTheme()
	const {
		teamStore: { activeTeam },
	} = useStores()
	const { onUpdateOrganizationTeam, isTeamManager } = useOrganizationTeam()
	const [teamName, setTeamName] = useState("")
	const [error, setError] = useState(null)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (activeTeam) {
			setTeamName(activeTeam.name)
		}
		setError(null)
	}, [activeTeam, onDismiss])

	const onChangeTeamName = (text: string) => {
		if (text.length < 3) {
			setError("Must have at least 3 characters")
		} else {
			setError(null)
		}
		setTeamName(text)
	}

	const handleSubmit = async () => {
		if (!isTeamManager) {
			setError("Only team managers can change team name")
			return
		}

		if (teamName.length === 0) {
			setError("Team Name can't be empty")
			return
		}

		if (teamName.length < 3) {
			setError("Must have at least 3 characters")
			return
		}
		if (teamName !== activeTeam.name) {
			setIsLoading(true)
			await onUpdateOrganizationTeam({
				id: activeTeam.id,
				data: {
					...activeTeam,
					name: teamName,
				},
			})
			setIsLoading(false)
		}
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
			<View style={{ flex: 1 }}>
				<Text
					style={{
						...styles.formTitle,
						color: colors.primary,
					}}
				>
					{translate("settingScreen.teamSection.changeTeamName.mainTitle")}
				</Text>

				<TextInput
					style={{
						...styles.styleInput,
						color: colors.primary,
						borderColor: "#DCE4E8",
						...{
							backgroundColor: !isTeamManager ? (dark ? "#292C33" : "#EDF1F3") : colors.background,
						},
					}}
					placeholderTextColor={"#7B8089"}
					placeholder={translate("settingScreen.teamSection.changeTeamName.inputPlaceholder")}
					value={teamName}
					editable={!isLoading && isTeamManager}
					autoComplete={"off"}
					autoFocus={false}
					autoCorrect={false}
					autoCapitalize={"none"}
					onChangeText={(text) => onChangeTeamName(text)}
				/>

				{error ? (
					<Text
						style={{
							fontFamily: typography.primary.medium,
							fontSize: 12,
							color: "red",
							marginTop: 5,
						}}
					>
						{error}
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
})

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
		marginTop: 20,
		width: "100%",
	},
})

export default ChangeTeamName
