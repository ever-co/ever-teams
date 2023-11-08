/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import React, { useState } from "react"
import { Feather } from "@expo/vector-icons"
import { useAppTheme } from "../theme"

const Accordion = ({ children, title }) => {
	const [expanded, setExpanded] = useState(true)
	const { colors } = useAppTheme()

	function toggleItem() {
		setExpanded(!expanded)
	}

	const body = <View style={{ gap: 12 }}>{children}</View>
	return (
		<View style={[styles.accordContainer, { backgroundColor: colors.background }]}>
			<TouchableOpacity style={styles.accordHeader} onPress={toggleItem}>
				<Text style={[styles.accordTitle, { color: colors.primary }]}>{title}</Text>
				<Feather
					name={expanded ? "chevron-up" : "chevron-down"}
					size={25}
					color={colors.primary}
				/>
			</TouchableOpacity>
			{expanded && (
				<View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
					<View
						style={{
							width: "100%",
							borderBottomColor: "#F2F2F2",
							borderBottomWidth: 1,
						}}
					/>
				</View>
			)}
			{expanded && body}
		</View>
	)
}

export default Accordion

const styles = StyleSheet.create({
	accordContainer: {
		borderRadius: 8,
		marginVertical: 5,
		width: "100%",
	},
	accordHeader: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 12,
	},
	accordTitle: {
		fontSize: 20,
		fontWeight: "600",
	},
})
