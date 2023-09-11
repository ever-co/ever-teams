/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useMemo } from "react"
import { View, StyleSheet } from "react-native"
import { Avatar, Badge } from "react-native-paper"
import { imgTitle } from "../helpers/img-title"
import { IUser } from "../services/interfaces/IUserData"
import { useAppTheme } from "../theme"

interface Props {
	user: IUser
	size?: number
}
const ProfileImage: FC<Props> = ({ user, size }) => {
	const { colors } = useAppTheme()

	const imageUrl = useMemo(
		() => user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl,
		[user?.image?.thumb, user],
	)

	return (
		<View style={styles.container}>
			<View>
				{imageUrl ? (
					<Avatar.Image
						size={size - 6}
						style={{ ...styles.profileImage, width: size, height: size }}
						source={{
							uri: imageUrl,
						}}
					/>
				) : (
					<Avatar.Text
						label={imgTitle(user?.name)}
						size={size - 6}
						style={{ ...styles.profileImage, width: size, height: size }}
					/>
				)}
				<Badge size={25} style={[styles.onlineIcon, { borderColor: colors.background }]} />
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
	onlineIcon: {
		backgroundColor: "#27AE60",
		borderWidth: 4,
		bottom: 0,
		position: "absolute",
		right: 0,
	},
	profileImage: {
		borderColor: "#86DAA9",
		borderRadius: 200,
		borderWidth: 3,
	},
})
