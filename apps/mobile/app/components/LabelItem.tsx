/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, ReactNode } from "react"
import { View, StyleSheet, Text } from "react-native"
import { typography, useAppTheme } from "../theme"

interface Props {
	label: string
	background: string
	icon: ReactNode | undefined
}
const LabelItem: FC<Props> = ({ label, background, icon }) => {
	const { colors } = useAppTheme()
	return (
		<View style={[styles.container, { backgroundColor: background }]}>
			<View style={{ flexDirection: "row" }}>
				{icon}
				<Text style={[styles.labelTitle, { color: colors.primary }]}>{label}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		backgroundColor: "#D4EFDF",
		borderRadius: 10,
		flexDirection: "row",
		paddingHorizontal: 10,
		paddingVertical: 6,
		width: 97,
	},
	labelTitle: {
		fontFamily: typography.secondary.semiBold,
		fontSize: 10,
		fontWeight: "600",
		marginLeft: 5,
	},
})

export default LabelItem
