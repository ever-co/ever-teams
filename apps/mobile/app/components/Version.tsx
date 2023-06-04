import { StyleSheet, Text, View, ViewStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import React, { FC } from "react"
import { typography, useAppTheme } from "../theme"

interface Props {
	containerStyle?: ViewStyle
}

const Version: FC<Props> = ({ containerStyle }) => {
	const { colors } = useAppTheme()
	return (
		<View style={{ ...styles.container, ...containerStyle, borderColor: colors.border }}>
			<Text style={{ ...styles.text, color: colors.primary }}>V1</Text>
			<AntDesign name="down" color={colors.primary} />
		</View>
	)
}
const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 9,
	},
	text: {
		fontFamily: typography.primary.semiBold,
		fontSize: 10,
	},
})

export default Version
