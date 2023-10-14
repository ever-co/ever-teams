/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { View, Text } from "react-native"
import { SvgUri } from "react-native-svg"
import { typography } from "../theme"
import { observer } from "mobx-react-lite"
import { limitTextCharaters } from "../helpers/sub-text"
import { useTaskSizes } from "../services/hooks/features/useTaskSizes"

export const BadgedTaskSize = observer(
	({ status, TextSize, iconSize }: { status: string; TextSize: number; iconSize: number }) => {
		const { allTaskSizes } = useTaskSizes()

		const currentSize = useMemo(
			() => allTaskSizes.find((s) => s.name === status),
			[status, allTaskSizes],
		)

		return (
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<SvgUri width={iconSize} height={iconSize} uri={currentSize?.fullIconUrl} />
				<Text
					style={{
						color: "#292D32",
						left: 5,
						fontSize: TextSize,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						textTransform: "capitalize",
					}}
				>
					{limitTextCharaters({ text: currentSize?.name, numChars: 15 }).replace("-", " ")}
				</Text>
			</View>
		)
	},
)
