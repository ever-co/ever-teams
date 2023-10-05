/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
import { StyleSheet, View, Text } from "react-native"
import React, { FC } from "react"
import { IUser } from "../../../../services/interfaces/IUserData"
import { Avatar } from "react-native-paper"
import { imgTitle } from "../../../../helpers/img-title"
import { typography, useAppTheme } from "../../../../theme"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { useTimer } from "../../../../services/hooks/useTimer"
import moment from "moment-timezone"

interface ITimerStatus {
	status: "running" | "online" | "idle" | "suspended" | "pause"
}
const TimerStatus: FC<ITimerStatus> = ({ status }) => {
	return (
		<View>
			{status === "online" && (
				/* For now until we have realtime we will use Play icon instead of Online icon */
				// <Avatar.Image
				// 	style={styles.statusIcon}
				// 	size={20}
				// 	source={require("../../../../../assets/icons/new/online.png")}
				// />
				<Avatar.Image
					style={styles.statusIcon}
					size={20}
					source={require("../../../../../assets/icons/new/play-small.png")}
				/>
			)}

			{status === "running" && (
				<Avatar.Image
					style={styles.statusIcon}
					size={20}
					source={require("../../../../../assets/icons/new/play-small.png")}
				/>
			)}

			{status === "idle" && (
				<Avatar.Image
					style={styles.statusIcon}
					size={20}
					source={require("../../../../../assets/icons/new/away.png")}
				/>
			)}

			{status === "suspended" && (
				<Avatar.Image
					style={styles.statusIcon}
					size={20}
					source={require("../../../../../assets/icons/new/play-small.png")}
				/>
			)}

			{status === "pause" && (
				<Avatar.Image
					style={styles.statusIcon}
					size={20}
					source={require("../../../../../assets/icons/new/on-pause.png")}
				/>
			)}
		</View>
	)
}

const UserHeaderCard = ({ member, user }: { member: OT_Member; user: IUser }) => {
	const { colors } = useAppTheme()

	const { timerStatus } = useTimer()

	// console.log(
	// 	!timerStatus?.running &&
	// 		timerStatus?.lastLog &&
	// 		timerStatus?.lastLog?.startedAt &&
	// 		moment().diff(moment(timerStatus?.lastLog?.startedAt), "hours") < 24,
	// )

	return (
		<View style={styles.wrapProfileImg}>
			{user.image?.thumbUrl || user.imageUrl || user.image?.fullUrl ? (
				<Avatar.Image
					style={styles.teamImage}
					size={40}
					source={{
						uri: user.image?.thumbUrl || user.imageUrl || user.image?.fullUrl,
					}}
				/>
			) : (
				<Avatar.Text
					style={styles.teamImage}
					size={40}
					label={imgTitle(user.name)}
					labelStyle={styles.prefix}
				/>
			)}
			<TimerStatus
				status={
					!timerStatus?.running &&
					timerStatus?.lastLog &&
					timerStatus?.lastLog?.startedAt &&
					moment().diff(moment(timerStatus?.lastLog?.startedAt), "hours") < 24 &&
					member?.employee?.isOnline &&
					timerStatus?.lastLog?.source !== "MOBILE"
						? "pause"
						: !member?.employee?.isActive
						? "suspended"
						: member?.employee?.isOnline
						? //  && member?.timerStatus !== 'running'
						  "online"
						: !member?.totalTodayTasks?.length
						? "idle"
						: member?.totalTodayTasks?.length
						? "pause"
						: member?.timerStatus || "idle"
				}
			/>
			<Text style={[styles.name, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
				{user.name}
			</Text>
		</View>
	)
}

export default UserHeaderCard

const styles = StyleSheet.create({
	name: {
		color: "#1B005D",
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 12,
		left: 15,
		maxWidth: "70%",
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
	},
	statusIcon: {
		marginLeft: -13,
		top: 10,
	},
	teamImage: {
		backgroundColor: "#C1E0EA",
	},
	wrapProfileImg: {
		alignItems: "center",
		flexDirection: "row",
	},
})
