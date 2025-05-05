/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { View, Text } from "react-native"
import { SvgUri } from "react-native-svg"
import { typography, useAppTheme } from "../theme"
import { observer } from "mobx-react-lite"
import { limitTextCharaters } from "../helpers/sub-text"
import { useTaskVersion } from "../services/hooks/features/useTaskVersion"

export const BadgedTaskVersion = observer(
	({ version, TextSize, iconSize }: { version: string; TextSize: number; iconSize: number }) => {
		const { taskVersionList } = useTaskVersion()
		const { colors } = useAppTheme()

		const currentSize = useMemo(
			() => taskVersionList.find((s) => s.name === version),
			[version, taskVersionList],
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
						color: colors.primary,
						left: 5,
						fontSize: TextSize,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						textTransform: "capitalize",
					}}
				>
					{limitTextCharaters({ text: currentSize?.name, numChars: 15 })}
				</Text>
			</View>
		)
	},
)
