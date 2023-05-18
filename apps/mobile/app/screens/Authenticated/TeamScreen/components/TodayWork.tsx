/* eslint-disable react-native/no-color-literals */
/* eslint-disable camelcase */
import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, Text, StyleSheet } from "react-native"
import { secondsToTime } from "../../../../helpers/date"
import { pad } from "../../../../helpers/number"
import { translate } from "../../../../i18n"
import { I_TeamMemberCardHook } from "../../../../services/hooks/features/useTeamMemberCard"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { typography } from "../../../../theme/typography"

interface IProps {
	isAuthUser: boolean
	memberInfo: I_TeamMemberCardHook
}

export const TodayWorkedTime: FC<IProps> = observer(({ memberInfo, isAuthUser }) => {
	// Get current timer seconds
	const { activeTeam } = useOrganizationTeam()

	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo?.member?.id)

	const { h, m } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.reduce(
				(previousValue, currentValue) => previousValue + currentValue.duration,
				0,
			)) ||
			0,
	)

	return (
		<View style={styles.container}>
			<Text style={styles.totalTimeTitle}>{translate("teamScreen.cardTodayWorkLabel")}</Text>
			<Text style={styles.totalTimeText}>
				{pad(h)} h:{pad(m)} m
			</Text>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		height: "80%",
		justifyContent: "space-between",
	},
	totalTimeText: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 12,
	},
	totalTimeTitle: {
		color: "#7E7991",
		fontFamily: typography.secondary.medium,
		fontSize: 10,
	},
})
