import React from "react"
import { View, StyleSheet, Image } from "react-native"
import { typography, useAppTheme } from "../../../../theme"
import { Feather } from "@expo/vector-icons"

// COMPONENTS
import { Text } from "../../../../components"
import { IUser } from "../../../../services/interfaces/IUserData"
import ProfileImage from "../../../../components/ProfileImage"

const ProfileHeader = (member: IUser) => {
	const { colors } = useAppTheme()
	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ProfileImage imageUrl={member.imageUrl} />
			<View style={styles.containerInfo}>
				<Text style={[styles.name, { color: colors.primary }]}>{member?.name}</Text>
				<Text style={[styles.email, { color: colors.tertiary }]}>{member.email}</Text>
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
	wrapEditIcon: {
		backgroundColor: "#fff",
		borderRadius: 12,
		borderWidth: 1,
		height: 22,
		padding: 5,
		position: "absolute",
		right: 2,
		top: 5,
		width: 22,
	},
	wrapEditIconSmall: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 10,
		borderWidth: 1,
		height: 20,
		justifyContent: "center",
		left: 5,
		padding: 5,
		width: 20,
	},
})

export default ProfileHeader
