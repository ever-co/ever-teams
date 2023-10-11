/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, ReactNode } from "react"
import { View, StyleSheet, Text } from "react-native"
import { typography } from "../theme"
import { limitTextCharaters } from "../helpers/sub-text"

interface Props {
	label: string
	background: string
	icon: ReactNode | undefined
}
const LabelItem: FC<Props> = ({ label, background, icon }) => {
	return (
		<View style={[styles.container, { backgroundColor: background }]}>
			<View style={{ flexDirection: "row" }}>
				{icon}
				<Text style={[styles.labelTitle, { color: "#282048" }]} numberOfLines={1}>
					{limitTextCharaters({ text: label, numChars: 18 })}
				</Text>
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
		maxWidth: 130,
		minWidth: 70,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	labelTitle: {
		fontFamily: typography.secondary.semiBold,
		fontSize: 10,
		fontWeight: "600",
		marginLeft: 5,
		textTransform: "capitalize",
	},
})

export default LabelItem
