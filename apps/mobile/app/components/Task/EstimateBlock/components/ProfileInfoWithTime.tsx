/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { Text, StyleSheet, TouchableOpacity, View } from "react-native"
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
	estimationsBlock?: boolean
	time?: string
}

const ProfileInfoWithTime: React.FC<IProfileInfo> = ({
	profilePicSrc,
	names,
	userId,
	largerProfileInfo,
	time,
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
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				paddingRight: !time && 12,
			}}
		>
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

				<Text
					style={{
						fontSize: largerProfileInfo ? 16 : 12,
						color: colors.primary,
						fontWeight: "600",
					}}
				>
					{limitTextCharaters({
						text: names.trim(),
						numChars: 12,
					})}
				</Text>
			</TouchableOpacity>
			<Text
				style={{
					fontSize: 12,
					fontWeight: "600",
					color: time ? colors.primary : "#938FA3",
				}}
			>
				{time ? time : "6 h: 40 m"}
			</Text>
		</View>
	)
}

export default ProfileInfoWithTime

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
