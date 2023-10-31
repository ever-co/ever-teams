/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { Text, StyleSheet, TouchableOpacity } from "react-native"
import React from "react"
import { Avatar } from "react-native-paper"
import { imgTitleProfileAvatar } from "../../../../helpers/img-title-profile-avatar"
import { typography, useAppTheme } from "../../../../theme"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { useNavigation } from "@react-navigation/native"
import {
	DrawerNavigationProp,
	SettingScreenNavigationProp,
} from "../../../../navigators/AuthenticatedNavigator"

interface IProfileInfo {
	names: string
	profilePicSrc: string
	userId?: string
	largerProfileInfo?: boolean
}

const ProfileInfo: React.FC<IProfileInfo> = ({
	profilePicSrc,
	names,
	userId,
	largerProfileInfo,
}) => {
	const { colors } = useAppTheme()

	const alternateNavigation = useNavigation<DrawerNavigationProp<"AuthenticatedTab">>()
	const navigation = useNavigation<SettingScreenNavigationProp<"Profile">>()

	const navigateToProfile = () => {
		alternateNavigation.navigate("AuthenticatedTab")
		setTimeout(() => {
			navigation.navigate("Profile", { userId, activeTab: "worked" })
		}, 50)
	}
	return (
		<TouchableOpacity onPress={userId && navigateToProfile} style={styles.container}>
			{profilePicSrc ? (
				<Avatar.Image
					source={{ uri: profilePicSrc }}
					size={largerProfileInfo ? 30 : 20}
					style={styles.profileImage}
				/>
			) : (
				<Avatar.Text
					label={imgTitleProfileAvatar(names.replace(" ", ""))}
					size={largerProfileInfo ? 30 : 20}
					style={[styles.profileImage, { backgroundColor: "#82c9e0" }]}
					labelStyle={[styles.prefix, { fontSize: 14 }]}
				/>
			)}

			<Text style={{ fontSize: largerProfileInfo ? 16 : 14, color: colors.primary }}>
				{limitTextCharaters({ text: names.trim(), numChars: 18 })}
			</Text>
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
	},
	profileImage: {
		borderRadius: 100,
	},
})
