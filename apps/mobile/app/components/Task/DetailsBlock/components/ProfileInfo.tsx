/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { Text, StyleSheet, TouchableOpacity } from "react-native"
import React from "react"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { typography } from "../../../../theme"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { useNavigation } from "@react-navigation/native"
import {
	DrawerNavigationProp,
	SettingScreenNavigationProp,
} from "../../../../navigators/AuthenticatedNavigator"

interface IProfileInfo {
	names: string
	profilePicSrc: string
	userId: string
}

const ProfileInfo: React.FC<IProfileInfo> = ({ profilePicSrc, names, userId }) => {
	const alternateNavigation = useNavigation<DrawerNavigationProp<"AuthenticatedTab">>()
	const navigation = useNavigation<SettingScreenNavigationProp<"Profile">>()

	const navigateToProfile = () => {
		alternateNavigation.navigate("AuthenticatedTab")
		setTimeout(() => {
			navigation.navigate("Profile", { userId, activeTab: "worked" })
		}, 50)
	}
	return (
		<TouchableOpacity onPress={navigateToProfile} style={styles.container}>
			{profilePicSrc ? (
				<Avatar.Image
					source={{ uri: profilePicSrc }}
					size={20}
					style={styles.profileImage}
				/>
			) : (
				<Avatar.Text
					label={imgTitleProfileAvatar(names.replace(" ", ""))}
					size={20}
					style={[styles.profileImage, { backgroundColor: "#82c9e0" }]}
					labelStyle={styles.prefix}
				/>
			)}

			<Text>{limitTextCharaters({ text: names.trim(), numChars: 18 })}</Text>
		</TouchableOpacity>
	)
}

export default ProfileInfo

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		flexDirection: "row",
		gap: 7,
	},
	prefix: {
		color: "#FFFFFF",
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 14,
	},
	profileImage: {
		borderRadius: 100,
	},
})
