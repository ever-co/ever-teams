/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo } from "react"
import { View, StyleSheet } from "react-native"
import { Avatar } from "react-native-paper"
import { IUser } from "../services/interfaces/IUserData"
import { typography, useAppTheme } from "../theme"
import { imgTitleProfileAvatar } from "../helpers/img-title-profile-avatar"
import { useOrganizationTeam } from "../services/hooks/useOrganization"
import { useTimer } from "../services/hooks/useTimer"
import { getTimerStatusValue } from "../helpers/get-timer-status"
import {
	idleStatusIcon,
	onlineAndTrackingTimeStatusIcon,
	pauseStatusIcon,
	suspendedStatusIcon,
} from "./svgs/icons"
import { SvgXml } from "react-native-svg"

interface Props {
	user: IUser
	size?: number
}
const ProfileImage: FC<Props> = ({ user, size }) => {
	const { colors } = useAppTheme()

	const { currentTeam } = useOrganizationTeam()

	const currentMember = currentTeam?.members.find(
		(currentMember) => currentMember.employee.userId === user.id,
	)

	const { timerStatus } = useTimer()

	const status = getTimerStatusValue(timerStatus, currentMember, currentTeam?.public)

	const imageUrl = useMemo(
		() => user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl,
		[user?.image?.thumb, user],
	)

	let iconSvgXml = ""

	switch (status) {
		case "online":
			iconSvgXml = onlineAndTrackingTimeStatusIcon
			break
		case "pause":
			iconSvgXml = pauseStatusIcon
			break
		case "idle":
			iconSvgXml = idleStatusIcon
			break
		case "suspended":
			iconSvgXml = suspendedStatusIcon
			break
	}

	return (
		<View style={styles.container}>
			<View>
				{imageUrl ? (
					<Avatar.Image
						size={size - 6}
						style={{
							...styles.profileImage,
							width: size,
							height: size,
							borderColor:
								status === "online"
									? "#6EE7B7"
									: status === "pause"
									? "#EFCF9E"
									: status === "idle"
									? "#F5BEBE"
									: "#DCD6D6",
						}}
						source={{
							uri: imageUrl,
						}}
					/>
				) : (
					<Avatar.Text
						label={imgTitleProfileAvatar(user?.name)}
						size={size - 6}
						style={{
							...styles.profileImage,
							width: size,
							height: size,
							borderColor:
								status === "online"
									? "#6EE7B7"
									: status === "pause"
									? "#EFCF9E"
									: status === "idle"
									? "#F5BEBE"
									: "#DCD6D6",
						}}
						labelStyle={styles.prefix}
					/>
				)}
				<View
					style={{
						right: 0,
						bottom: 0,
						borderRadius: 100,
						width: 22,
						height: 22,
						position: "absolute",
						backgroundColor: "#EFCF9E",
						alignItems: "center",
						justifyContent: "center",
						borderColor: colors.background,
						borderWidth: 2,
					}}
				>
					<SvgXml xml={iconSvgXml} />
				</View>
			</View>
		</View>
	)
}
export default ProfileImage

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		height: "10%",
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 42,
		fontWeight: "200",
	},
	profileImage: {
		borderRadius: 200,
		borderWidth: 3,
	},
})
