/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, Text, StyleSheet } from "react-native"
import React, { useCallback, useEffect, useState } from "react"
import { useStores } from "../../../../models"
import { translate } from "../../../../i18n"
import { SvgXml } from "react-native-svg"
import { globeDarkTheme, globeLightTheme, lockDarkTheme, lockLightTheme } from "../../../svgs/icons"
import { useAppTheme } from "../../../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { debounce } from "lodash"
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks"

const TaskPublicity = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()
	const { updatePublicity } = useTeamTasks()

	const { dark, colors } = useAppTheme()
	const [isTaskPublic, setIsTaskPublic] = useState<boolean | undefined>(task?.public)

	const handlePublicity = useCallback(
		(value: boolean) => {
			setIsTaskPublic(value)
			const debounceUpdatePublicity = debounce((value) => {
				updatePublicity(value, task, true)
			}, 500)
			debounceUpdatePublicity(value)
		},
		[task, updatePublicity],
	)

	useEffect(() => {
		setIsTaskPublic(task?.public)
	}, [task?.public])

	return (
		<View style={{ padding: 12, backgroundColor: dark ? "#1E2025" : "#FBFAFA" }}>
			{isTaskPublic ? (
				<View style={styles.wrapper}>
					<View style={styles.taskPrivacyWrapper}>
						<SvgXml xml={dark ? globeDarkTheme : globeLightTheme} />
						<Text style={{ color: colors.primary, fontSize: 12 }}>
							{translate("taskDetailsScreen.taskPublic")}
						</Text>
					</View>
					<TouchableOpacity onPress={() => handlePublicity(false)}>
						<Text style={{ color: "#A5A2B2", fontSize: 12 }}>
							{translate("taskDetailsScreen.makePrivate")}
						</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.wrapper}>
					<View style={styles.taskPrivacyWrapper}>
						<SvgXml xml={dark ? lockDarkTheme : lockLightTheme} />
						<Text style={{ color: colors.primary, fontSize: 12 }}>
							{translate("taskDetailsScreen.taskPrivate")}
						</Text>
					</View>
					<TouchableOpacity onPress={() => handlePublicity(true)}>
						<Text style={{ color: "#A5A2B2", fontSize: 12 }}>
							{translate("taskDetailsScreen.makePublic")}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	)
}

export default TaskPublicity

const styles = StyleSheet.create({
	taskPrivacyWrapper: {
		alignItems: "center",
		flexDirection: "row",
		gap: 8,
	},
	wrapper: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
})
