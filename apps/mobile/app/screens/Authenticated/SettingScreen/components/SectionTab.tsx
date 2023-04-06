import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native"
import { translate } from "../../../../i18n"
import { typography, useAppTheme } from "../../../../theme"

interface ISectionTab {
	id: number
	title: string
}

const SectionTab = ({
	activeTabId,
	toggleTab,
}: {
	activeTabId: number
	toggleTab: (tab: number) => unknown
}) => {
	const sections: ISectionTab[] = [
		{
			id: 1,
			title: translate("settingScreen.personalSection.name"),
		},
		{
			id: 2,
			title: translate("settingScreen.teamSection.name"),
		},
	]

	const { colors } = useAppTheme()
	return (
		<View style={[styles.contaniner, { backgroundColor: colors.background2 }]}>
			{sections.map((tab, idx) => (
				<Tab key={idx} isActiveTab={tab.id === activeTabId} item={tab} toggleTab={toggleTab} />
			))}
		</View>
	)
}

const Tab = ({
	item,
	isActiveTab,
	toggleTab,
}: {
	item: ISectionTab
	isActiveTab: boolean
	toggleTab: (tab: number) => unknown
}) => {
	const { colors } = useAppTheme()
	return (
		<TouchableOpacity
			style={
				isActiveTab
					? [
							styles.activeSection,
							{ backgroundColor: colors.background, borderColor: colors.secondary },
					  ]
					: [styles.inactiveSection]
			}
			onPress={() => toggleTab(item.id)}
		>
			<View
				style={{
					flexDirection: "row",
					alignSelf: "center",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{item.id == 1 ? (
					<Ionicons
						name="person"
						size={18}
						color={isActiveTab ? colors.secondary : colors.tertiary}
					/>
				) : (
					<FontAwesome5
						name="users"
						size={18}
						color={isActiveTab ? colors.secondary : colors.tertiary}
					/>
				)}
				<Text
					style={[
						styles.text,
						isActiveTab ? { fontSize: 14, color: colors.secondary } : { color: colors.tertiary },
					]}
				>
					{item.title}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	activeSection: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 70,
		borderWidth: 2,
		elevation: 10,
		flexDirection: "row",
		height: 50,
		justifyContent: "center",
		shadowColor: "rgba(30, 12, 92, 0.26)",
		shadowOffset: { width: 10, height: 10 },
		shadowOpacity: 1,
		shadowRadius: 8,
		width: 155,
	},
	contaniner: {
		backgroundColor: "rgba(217, 217, 217, 0.3)",
		borderRadius: 70,
		flexDirection: "row",
		height: 62,
		justifyContent: "space-between",
		padding: 6,
		width: "100%",
	},
	inactiveSection: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "center",
		width: 155,
	},
	text: {
		color: "#3826A6",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginLeft: 8,
	},
})

export default SectionTab
