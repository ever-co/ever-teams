/* eslint-disable react-native/no-inline-styles */
import React from "react"
import { View, Text, Dimensions, Image, TouchableOpacity } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import { typography } from "../../../theme"

const LoginBottom = () => {
	return (
		<View style={styles.bottomSection}>
			<Text style={styles.bottomSectionTxt}>
				© 2022-Present, Gauzy Teams by Ever Co. LTD. All rights reserved.
			</Text>
			<TouchableOpacity style={{ flex: 1 }}>
				<Image
					style={styles.imageTheme}
					source={require("../../../../assets/icons/new/toogle-light.png")}
				/>
			</TouchableOpacity>
		</View>
	)
}

export default LoginBottom

const { width } = Dimensions.get("window")

const styles = EStyleSheet.create({
	imageTheme: {
		height: "3.1rem",
		marginBottom: "-1.5rem",
	},
	bottomSection: {
		position: "absolute",
		justifyContent: "space-between",
		alignItems: "center",
		width: width - 40,
		display: "flex",
		flexDirection: "row",
		alignSelf: "center",
		bottom: 0,
		marginBottom: "2rem",
		paddingTop: "1rem",
		borderTopColor: "rgba(0, 0, 0, 0.16)",
		borderTopWidth: 1,
		zIndex: 100,
	},
	bottomSectionTxt: {
		flex: 3,
		fontSize: "0.7rem",
		fontFamily: typography.primary.medium,
		color: "rgba(126, 121, 145, 0.7)",
	},
})
