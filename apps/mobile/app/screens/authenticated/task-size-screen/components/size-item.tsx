/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, Text, StyleSheet } from "react-native"
import { AntDesign, Ionicons } from "@expo/vector-icons"
import { typography, useAppTheme } from "../../../../theme"
import { ITaskSizeItem } from "../../../../services/interfaces/ITaskSize"
import { SvgUri } from "react-native-svg"
import { formatName } from "../../../../helpers/name-format"
import { readOnlyOpacity } from "../../../../helpers/read-only-opacity"

interface ISizeItem {
	size: ITaskSizeItem
	onDeleteSize: () => unknown
	openForEdit: () => unknown
	/** Shows the edit and delete actions disabled, for a user who may not change this size. */
	readOnly?: boolean
}

const StatusItem: FC<ISizeItem> = ({ size, onDeleteSize, openForEdit, readOnly = false }) => {
	const { colors, dark } = useAppTheme()
	const actionsOpacity = readOnlyOpacity(readOnly)
	return (
		<View
			style={{
				...styles.container,
				backgroundColor: dark ? "#181C24" : colors.background,
				borderColor: "rgba(0,0,0,0.13)",
			}}
		>
			<View style={{ ...styles.statusContainer, backgroundColor: size?.color }}>
				<SvgUri width={20} height={20} uri={size?.fullIconUrl ?? null} />
				<Text style={styles.text}>{formatName(size?.name ?? '')}</Text>
			</View>
			{/* No press handlers on a read-only row: it never relies on the icons honoring `disabled` */}
			<View style={{ ...styles.rightSection, opacity: actionsOpacity }}>
				<AntDesign
					size={16}
					name={"edit"}
					color={colors.primary}
					accessibilityRole="button"
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					onPress={readOnly ? undefined : () => openForEdit()}
				/>
				<Ionicons
					name="trash-outline"
					size={16}
					color={"#DE5536"}
					accessibilityRole="button"
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					onPress={readOnly ? undefined : () => onDeleteSize()}
				/>
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
