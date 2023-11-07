/* eslint-disable react-native/no-inline-styles */
import { View, StyleSheet } from "react-native"
import React from "react"

interface ITaskRow {
	labelComponent: React.ReactNode
	children: React.ReactNode
	alignItems?: boolean
}

const TaskRow = ({ labelComponent, children, alignItems }: ITaskRow) => {
	return (
		<View style={[styles.container, { alignItems: alignItems ? "center" : "flex-start" }]}>
			<View style={styles.labelContainer}>{labelComponent}</View>
			<View style={styles.childrenContainer}>{children}</View>
		</View>
	)
}

export default TaskRow

const styles = StyleSheet.create({
	childrenContainer: {
		gap: 7,
		width: "56%",
	},
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	labelContainer: {
		width: "40%",
	},
})
