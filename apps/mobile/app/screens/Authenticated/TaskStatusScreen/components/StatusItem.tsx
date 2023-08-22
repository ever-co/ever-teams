/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, Text, StyleSheet } from "react-native"
import { AntDesign, Ionicons } from "@expo/vector-icons"
import { typography, useAppTheme } from "../../../../theme"
import { ITaskStatusItem } from "../../../../services/interfaces/ITaskStatus"
import { formatName } from "../../../../helpers/name-format"
// import { useTaskStatusValue } from "../../../../components/StatusType"

interface IStatusItem {
	status: ITaskStatusItem
	onDeleteTask: () => unknown
	openForEdit: () => unknown
}

const StatusItem: FC<IStatusItem> = ({ status, onDeleteTask, openForEdit }) => {
	const { colors, dark } = useAppTheme()
	// const allStatuses = useTaskStatusValue()
	// const cStatus = allStatuses[status.name.split("-").join(" ")]

	return (
		<View
			style={{
				...styles.container,
				backgroundColor: dark ? "#181C24" : colors.background,
				borderColor: "rgba(0,0,0,0.13)",
			}}
		>
			<View style={{ ...styles.statusContainer, backgroundColor: status.color }}>
				<AntDesign name="pay-circle-o1" size={20} color="#000" />
				<Text style={styles.text}>{formatName(status.name)}</Text>
			</View>
			<View style={styles.rightSection}>
				<AntDesign size={16} name={"edit"} color={colors.primary} onPress={() => openForEdit()} />
				<Ionicons name="trash-outline" size={16} color={"#DE5536"} onPress={() => onDeleteTask()} />
			</View>
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
		marginTop: 16,
		padding: 6,
		paddingRight: 16,
		width: "100%",
	},
	rightSection: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "16%",
	},
	statusContainer: {
		alignItems: "center",
		backgroundColor: "#D4EFDF",
		borderRadius: 10,
		flexDirection: "row",
		height: "100%",
		paddingHorizontal: 16,
		paddingVertical: 12,
		width: "60%",
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginLeft: 13.5,
	},
})

export default StatusItem
