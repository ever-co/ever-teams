/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
import { StyleSheet, View, Text } from "react-native"
import React, { FC } from "react"
import { IUser } from "../../../../services/interfaces/IUserData"
import { Avatar } from "react-native-paper"
import { typography, useAppTheme } from "../../../../theme"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import { useTimer } from "../../../../services/hooks/useTimer"
import moment from "moment-timezone"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"

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
					label={imgTitleProfileAvatar(user.name)}
					labelStyle={styles.prefix}
				/>
			)}
			<TimerStatus
				status={
					!timerStatus?.running &&
					timerStatus?.lastLog &&
					timerStatus?.lastLog?.startedAt &&
					moment().diff(moment(timerStatus?.lastLog?.startedAt), "hours") < 24 &&
					(timerStatus?.lastLog?.source !== "MOBILE" || member?.employee?.isOnline)
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
		color: "#FFFFFF",
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 26,
		fontWeight: "200",
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
