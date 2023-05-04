/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from "react"
import { View, StyleSheet } from "react-native"
import { typography, useAppTheme } from "../../../../theme"

// COMPONENTS
import { Text } from "../../../../components"
import { IUser } from "../../../../services/interfaces/IUserData"
import ProfileImage from "../../../../components/ProfileImage"

const ProfileHeader = (member: IUser) => {
	const { colors, dark } = useAppTheme()
	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: !dark ? "rgba(255, 255, 255, 0.5)" : colors.background },
			]}
		>
			<ProfileImage user={member} size={70} />
			<View style={styles.containerInfo}>
				<Text style={[styles.name, { color: colors.primary }]}>{member?.name}</Text>
				<Text style={[styles.email, { color: colors.tertiary }]}>{member?.email}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#fff",
		flexDirection: "row",
		paddingBottom: 24,
		paddingHorizontal: 20,
		paddingTop: 14,
	},
	containerInfo: {
		justifyContent: "center",
		marginLeft: 10,
	},
	email: {
		color: "#7E7991",
		fontFamily: typography.secondary.medium,
		fontSize: 12,
	},
	name: {
		color: "#282048",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
})

export default ProfileHeader
