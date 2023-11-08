/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import React, { ReactElement, useState } from "react"
import { Feather } from "@expo/vector-icons"
import { useAppTheme } from "../theme"

interface IAccordion {
	title: string
	children: ReactElement | ReactElement[]
	titleFontSize?: number
	arrowSize?: number
	headerElement?: ReactElement
}

const Accordion: React.FC<IAccordion> = ({
	children,
	title,
	arrowSize,
	titleFontSize,
	headerElement,
}) => {
	const [expanded, setExpanded] = useState(true)
	const { colors } = useAppTheme()

	function toggleItem() {
		setExpanded(!expanded)
	}

	const body = <View style={{ gap: 12 }}>{children}</View>
	return (
		<View style={[styles.accordContainer, { backgroundColor: colors.background }]}>
			<TouchableOpacity style={styles.accordHeader} onPress={toggleItem}>
				<Text
					style={[
						styles.accordTitle,
						{ color: colors.primary, fontSize: titleFontSize || 16 },
					]}
				>
					{title}
				</Text>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					{headerElement}
					<Feather
						name={expanded ? "chevron-up" : "chevron-down"}
						size={arrowSize || 22}
						color={colors.primary}
						style={{ marginLeft: 7 }}
					/>
				</View>
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
		fontWeight: "600",
	},
})
