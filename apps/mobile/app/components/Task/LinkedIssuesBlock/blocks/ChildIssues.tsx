/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, Text, View } from "react-native"
import React from "react"
import Accordion from "../../../Accordion"
import { AntDesign, Entypo } from "@expo/vector-icons"

const ChildIssues = () => {
	return (
		<Accordion
			titleFontSize={14}
			arrowSize={20}
			title="Child Issues"
			headerElement={
				<View style={styles.headerElement}>
					<AntDesign name="plus" size={16} color="#B1AEBC" />
					<Entypo name="dots-three-horizontal" size={16} color="#B1AEBC" />
					<View style={styles.verticalSeparator} />
				</View>
			}
		>
			<Text>ChildIssues</Text>
		</Accordion>
	)
}

export default ChildIssues

const styles = StyleSheet.create({
	headerElement: { alignItems: "center", flexDirection: "row", gap: 10 },
	verticalSeparator: { borderRightColor: "#B1AEBC", borderRightWidth: 1, height: 20 },
})
