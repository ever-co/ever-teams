/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { Screen } from "../../../components"
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator"
import { translate } from "../../../i18n"

import { typography, useAppTheme } from "../../../theme"

import Animated from "react-native-reanimated"

export const TaskVersionScreen: FC<AuthenticatedDrawerScreenProps<"TaskVersion">> =
	function AuthenticatedDrawerScreen(_props) {
		const { colors } = useAppTheme()
		const { navigation } = _props

		return (
			<Screen
				contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
				safeAreaEdges={["top"]}
			>
				<Animated.View>
					<View style={[$headerContainer, { backgroundColor: colors.background }]}>
						<View style={[styles.container, { backgroundColor: colors.background }]}>
							<TouchableOpacity onPress={() => navigation.navigate("Setting")}>
								<AntDesign name="arrowleft" size={24} color={colors.primary} />
							</TouchableOpacity>
							<Text style={[styles.title, { color: colors.primary }]}>
								{translate("settingScreen.statusScreen.mainTitle")}
							</Text>
						</View>
					</View>
				</Animated.View>
			</Screen>
		)
	}

const $container: ViewStyle = {
	flex: 1,
}
const $headerContainer: ViewStyle = {
	padding: 20,
	paddingVertical: 16,
	shadowColor: "rgba(0, 0, 0, 0.6)",
	shadowOffset: {
		width: 0,
		height: 2,
	},
	shadowOpacity: 0.07,
	shadowRadius: 1.0,
	elevation: 1,
	zIndex: 10,
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		flexDirection: "row",
		width: "100%",
	},

	title: {
		alignSelf: "center",
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: "center",
		width: "80%",
	},
})
