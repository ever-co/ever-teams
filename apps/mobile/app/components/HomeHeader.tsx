/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import HeaderTimer from "./HeaderTimer"
import { useAppTheme } from "../theme"
import { useOrganizationTeam } from "../services/hooks/useOrganization"
import { SvgXml } from "react-native-svg"
import { everTeamsLogoDarkTheme, everTeamsLogoLightTheme } from "./svgs/icons"

interface Props {
	showTimer: boolean
	props: any
}

const HomeHeader: FC<Props> = ({ props, showTimer }) => {
	const { colors, dark } = useAppTheme()
	const { activeTeam } = useOrganizationTeam()
	return (
		<View
			style={[
				styles.mainContainer,
				{ backgroundColor: dark ? colors.background2 : colors.background },
			]}
		>
			<View
				style={[
					styles.secondContainer,
					{ backgroundColor: dark ? colors.background2 : colors.background },
				]}
			>
				{dark ? (
					// <Image
					// 	style={styles.logo}
					// 	source={require("../../assets/images/new/gauzy-teams-white.png")}
					// 	resizeMode="contain"
					// />
					<SvgXml xml={everTeamsLogoDarkTheme} />
				) : (
					// <Image
					// 	style={styles.logo}
					// 	source={require("../../assets/images/new/gauzy-teams.png")}
					// 	resizeMode="contain"
					// />
					<SvgXml xml={everTeamsLogoLightTheme} />
				)}
				{showTimer && activeTeam && (
					<View style={{ width: 126 }}>
						<HeaderTimer />
					</View>
				)}
				<TouchableOpacity activeOpacity={0.7} onPress={() => props.navigation.openDrawer()}>
					<Feather name="menu" size={24} color={colors.primary} />
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	// logo: {
	// 	height: 15,
	// 	width: 120,
	// },
	mainContainer: {
		elevation: 1,
		paddingHorizontal: 25,
		paddingVertical: 20,
	},
	secondContainer: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
})

export default HomeHeader
