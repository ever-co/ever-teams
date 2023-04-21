/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { typography, useAppTheme } from "../../../../theme"
import { translate } from "../../../../i18n"
import { limitTextCharaters } from "../../../../helpers/sub-text"

interface Props {
	title: string
	value: string
	onPress?: () => unknown
	onDetectTimezone?: () => unknown
}
const SingleInfo: FC<Props> = ({ title, value, onPress, onDetectTimezone }) => {
	const { colors, dark } = useAppTheme()

	return (
		<View style={styles.container}>
			<View style={styles.wrapperInfo}>
				<Text style={[styles.infoTitle, { color: colors.primary }]}>{title}</Text>
				<Text style={[styles.infoText, { color: colors.tertiary }]}>
					{limitTextCharaters({ text: value, numChars: 77 })}
				</Text>
			</View>
			{title === translate("settingScreen.personalSection.timeZone") ? (
				<TouchableOpacity
					style={[styles.detectWrapper, { backgroundColor: dark ? "#3D4756" : "#E6E6E9" }]}
					onPress={() => (onDetectTimezone ? onDetectTimezone() : {})}
				>
					<Text style={[styles.infoTitle, { fontSize: 12, color: colors.primary }]}>
						{translate("settingScreen.personalSection.detect")}
					</Text>
				</TouchableOpacity>
			) : null}

			{title !== translate("settingScreen.personalSection.themes") ? (
				<TouchableOpacity onPress={() => (onPress ? onPress() : {})}>
					<AntDesign name="right" size={24} color="#938FA4" />
				</TouchableOpacity>
			) : (
				<TouchableOpacity style={styles.toggle} onPress={() => (onPress ? onPress() : {})}>
					{dark ? (
						<Image style={{}} source={require("../../../../../assets/icons/new/toogle-dark.png")} />
					) : (
						<Image source={require("../../../../../assets/icons/new/toogle-light.png")} />
					)}
				</TouchableOpacity>
			)}
		</View>
	)
}
export default SingleInfo

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 32,
		width: "100%",
	},
	detectWrapper: {
		borderRadius: 8,
		paddingHorizontal: 13,
		paddingVertical: 8,
	},
	infoText: {
		color: "#938FA4",
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginTop: 10,
	},
	infoTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
	},
	toggle: {
		height: 40,
		right: -10,
		top: -10,
	},
	wrapperInfo: {
		maxWidth: "90%",
	},
})
