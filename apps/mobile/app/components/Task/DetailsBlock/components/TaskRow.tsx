import { View, StyleSheet } from "react-native"
import React from "react"

interface ITaskRow {
	labelComponent: React.ReactNode
	children: React.ReactNode
}

const TaskRow = ({ labelComponent, children }: ITaskRow) => {
	return (
		<View style={styles.container}>
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
