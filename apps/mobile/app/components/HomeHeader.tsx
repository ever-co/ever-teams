import React, { FC } from "react"
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { Feather } from "@expo/vector-icons"
import HeaderTimer from "./HeaderTimer"
import { useAppTheme } from "../theme"

interface Props {
	showTimer: boolean
	props: any
}

const { width } = Dimensions.get("window")
const HomeHeader: FC<Props> = ({ props, showTimer }) => {
	const { colors, dark } = useAppTheme()
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
					<Image
						style={styles.logo}
						source={require("../../assets/images/new/gauzy-teams-white.png")}
						resizeMode="contain"
					/>
				) : (
					<Image
						style={styles.logo}
						source={require("../../assets/images/new/gauzy-teams.png")}
						resizeMode="contain"
					/>
				)}
				{showTimer && (
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
	logo: {
		height: 15,
		width: 120,
	},
	mainContainer: {
		elevation: 1,
		paddingHorizontal: 25,
		paddingVertical: 20,
		shadowColor: "rgba(0, 0, 0, 0.7)",
		shadowOffset: {
			width: 1,
			height: 3,
		},
		shadowOpacity: 0.07,
		shadowRadius: 1.0,
	},
	secondContainer: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
})

export default HomeHeader
