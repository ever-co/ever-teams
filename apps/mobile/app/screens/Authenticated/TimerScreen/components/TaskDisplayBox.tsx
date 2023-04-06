import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { FontAwesome, AntDesign, Entypo } from "@expo/vector-icons"
import { typography, useAppTheme } from "../../../../theme"

type ITasDisplayBox = {
	count: number
	openTask: boolean
	selected: boolean
}

const TaskDisplayBox = ({ count, openTask, selected }: ITasDisplayBox) => {
	const { colors } = useAppTheme()
	return (
		<View
			style={[styles.container, { borderColor: colors.border, backgroundColor: colors.background }]}
		>
			{openTask ? (
				<>
					<FontAwesome name="circle" size={18} color="#9BD9B4" />
					<Text
						style={[
							styles.filterText,
							selected
								? { color: colors.secondary, fontWeight: "bold" }
								: { color: colors.tertiary },
						]}
					>{`${count} Open`}</Text>
				</>
			) : (
				<>
					<AntDesign name="checkcircleo" size={18} color="#BEBCC8" />
					<Text
						style={[
							styles.filterText,
							selected
								? { color: colors.secondary, fontWeight: "bold" }
								: { color: colors.tertiary },
						]}
					>{`${count} Closed`}</Text>
				</>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderRadius: 38,
		borderWidth: 1,
		flexDirection: "row",
		height: 26,
		paddingLeft: 10,
		width: 110,
	},
	filterText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 11,
		left: 8,
	},
})

export default TaskDisplayBox
