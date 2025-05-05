/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, Text, StyleSheet } from "react-native"
import { AntDesign, Ionicons } from "@expo/vector-icons"
import { typography, useAppTheme } from "../../../../theme"
import { formatName } from "../../../../helpers/name-format"
import { ITaskVersionItemList } from "../../../../services/interfaces/ITaskVersion"

interface IVersionItem {
	version: ITaskVersionItemList
	onDeleteTask: () => unknown
	openForEdit: () => unknown
}

const VersionItem: FC<IVersionItem> = ({ version, onDeleteTask, openForEdit }) => {
	const { colors, dark } = useAppTheme()

	return (
		<View
			style={{
				...styles.container,
				backgroundColor: dark ? "#181C24" : colors.background,
				borderColor: "rgba(0,0,0,0.13)",
			}}
		>
			<View
				style={{
					...styles.versionContainer,
					backgroundColor: dark ? "#181C24" : colors.background,
				}}
			>
				<Text style={{ ...styles.text, color: colors.primary }}>
					{formatName(version?.name)}
				</Text>
			</View>
			<View style={styles.rightSection}>
				<AntDesign
					size={16}
					name={"edit"}
					color={colors.primary}
					onPress={() => openForEdit()}
				/>
				<Ionicons
					name="trash-outline"
					size={16}
					color={"#DE5536"}
					onPress={() => onDeleteTask()}
				/>
			</View>
		</View>
	)
}

export default VersionItem

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
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginLeft: 13.5,
	},
	versionContainer: {
		alignItems: "center",
		backgroundColor: "#D4EFDF",
		borderRadius: 10,
		flexDirection: "row",
		height: "100%",
		paddingHorizontal: 16,
		paddingVertical: 12,
		width: "60%",
	},
})
