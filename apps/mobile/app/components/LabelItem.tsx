import React, { FC } from "react"
import { Feather } from "@expo/vector-icons"
import { View, StyleSheet, Text, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { typography, useAppTheme } from "../theme"

interface Props {
	label: string
	labelColor: string
	background: string[]
	icon: any
}
const LabelItem: FC<Props> = ({ label, labelColor, background, icon }) => {
	const { colors, dark } = useAppTheme()
	return (
		<>
			{dark ? (
				<LinearGradient
					colors={[background[0], background[1], background[2]]}
					style={styles.container}
					start={{ x: 0.2, y: 0.5 }}
					end={{ x: 1, y: 1 }}
				>
					<View style={{ flexDirection: "row" }}>
						<Image source={icon} />
						<Text style={[styles.labelTitle, { color: labelColor }]}>{label}</Text>
					</View>
				</LinearGradient>
			) : (
				<View style={[styles.container, { backgroundColor: background[background.length - 1] }]}>
					<View style={{ flexDirection: "row" }}>
						<Image source={icon} />
						<Text style={[styles.labelTitle, { color: labelColor }]}>{label}</Text>
					</View>
				</View>
			)}
		</>
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
