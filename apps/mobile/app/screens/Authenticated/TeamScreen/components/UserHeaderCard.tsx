/* eslint-disable react-native/no-color-literals */
import { StyleSheet, View, Text } from "react-native"
import React from "react"
import { IUser } from "../../../../services/interfaces/IUserData"
import { Avatar } from "react-native-paper"
import { imgTitle } from "../../../../helpers/img-title"
import { typography, useAppTheme } from "../../../../theme"

const UserHeaderCard = ({ user }: { user: IUser }) => {
	const { colors } = useAppTheme()
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
			{/* <Avatar.Image
            style={styles.statusIcon}
            size={20}
            source={getStatusImage(userStatus).icon}
        /> */}
			<Text style={[styles.name, { color: colors.primary }]}>{user.name}</Text>
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
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontWeight: "600",
	},
	teamImage: {
		backgroundColor: "#C1E0EA",
	},
	wrapProfileImg: {
		alignItems: "center",
		flexDirection: "row",
	},
})
