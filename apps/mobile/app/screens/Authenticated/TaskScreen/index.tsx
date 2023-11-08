/* eslint-disable react-native/no-inline-styles */
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import React, { FC, useEffect } from "react"
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator"
import { Screen } from "../../../components"
import { typography, useAppTheme } from "../../../theme"
import { AntDesign } from "@expo/vector-icons"
import { useTeamTasks } from "../../../services/hooks/features/useTeamTasks"
import TaskTitleBlock from "../../../components/Task/TitleBlock"
import DetailsBlock from "../../../components/Task/DetailsBlock"
import { translate } from "../../../i18n"
import EstimateBlock from "../../../components/Task/EstimateBlock"
import TimeBlock from "../../../components/Task/TimeBlock"

export const AuthenticatedTaskScreen: FC<AuthenticatedDrawerScreenProps<"TaskScreen">> = (
	_props,
) => {
	const { colors } = useAppTheme()
	const { navigation, route } = _props
	const { taskId } = route.params
	const { getTaskById, detailedTask: task } = useTeamTasks()

	useEffect(() => {
		if (route.params.taskId) {
			getTaskById(taskId)
		}
	}, [getTaskById, route, task, route.params.taskId])

	return (
		<Screen
			contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
			safeAreaEdges={["top"]}
		>
			<View style={{ flex: 1 }}>
				<View style={[$headerContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.container, { backgroundColor: colors.background }]}>
						<TouchableOpacity onPress={() => navigation.navigate("AuthenticatedTab")}>
							<AntDesign name="arrowleft" size={24} color={colors.primary} />
						</TouchableOpacity>
						<Text style={[styles.title, { color: colors.primary }]}>
							{translate("taskDetailsScreen.taskScreen")}
						</Text>
					</View>
				</View>
				<View style={styles.screenContentWrapper}>
					<ScrollView
						style={{
							width: "100%",
							height: "100%",
							paddingHorizontal: 20,
						}}
						bounces={false}
						showsVerticalScrollIndicator={false}
					>
						<TaskTitleBlock />
						<DetailsBlock />
						<EstimateBlock />
						<TimeBlock />
					</ScrollView>
				</View>
			</View>
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
	screenContentWrapper: {
		alignItems: "center",
		flex: 4,
		gap: 12,
		paddingBottom: 20,
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
