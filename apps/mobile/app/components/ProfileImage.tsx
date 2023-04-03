import React, { FC } from "react"
import { View, Image, StyleSheet } from "react-native"
import { Avatar, Badge } from "react-native-paper"
import { useAppTheme } from "../theme"

interface Props {
	imageUrl: string
	size?: number
}
const ProfileImage: FC<Props> = ({ imageUrl, size }) => {
	const { colors } = useAppTheme()
	return (
		<View style={styles.container}>
			<View>
				<Avatar.Image size={70} source={{ uri: imageUrl }} />
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
		height: 56,
		width: 56,
	},
})
