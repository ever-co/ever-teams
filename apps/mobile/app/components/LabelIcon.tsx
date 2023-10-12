/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React from "react"
import { View, Text } from "react-native"
import { SvgUri } from "react-native-svg"
import { typography } from "../theme"
import { observer } from "mobx-react-lite"
import { limitTextCharaters } from "../helpers/sub-text"
import { ITaskLabelItem } from "../services/interfaces/ITaskLabel"

export const BadgedTaskLabel = observer(
	({
		label,
		TextSize,
		iconSize,
	}: {
		label: ITaskLabelItem
		TextSize: number
		iconSize: number
	}) => {
		return (
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<SvgUri width={iconSize} height={iconSize} uri={label?.fullIconUrl} />
				<Text
					style={{
						color: "#292D32",
						left: 5,
						fontSize: TextSize,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						textTransform: "capitalize",
					}}
				>
					{limitTextCharaters({ text: label?.name, numChars: 15 })}
				</Text>
			</View>
		)
	},
)
