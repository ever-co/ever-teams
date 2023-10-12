/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { View, Text } from "react-native"
import { SvgUri } from "react-native-svg"
import { typography } from "../theme"
import { observer } from "mobx-react-lite"
import { limitTextCharaters } from "../helpers/sub-text"
import { useTaskPriority } from "../services/hooks/features/useTaskPriority"

export const BadgedTaskPriority = observer(
	({ priority, TextSize, iconSize }: { priority: string; TextSize: number; iconSize: number }) => {
		const { allTaskPriorities } = useTaskPriority()

		const currentPriority = useMemo(
			() => allTaskPriorities.find((s) => s.name === priority),
			[priority, allTaskPriorities],
		)

		return (
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<SvgUri width={iconSize} height={iconSize} uri={currentPriority?.fullIconUrl} />
				<Text
					style={{
						color: "#292D32",
						left: 5,
						fontSize: TextSize,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						textTransform: "capitalize",
					}}
				>
					{limitTextCharaters({ text: currentPriority?.name, numChars: 15 }).replace("-", " ")}
				</Text>
			</View>
		)
	},
)
