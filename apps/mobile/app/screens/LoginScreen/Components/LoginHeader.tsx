/* eslint-disable react-native/no-inline-styles */
import { View, Text, Dimensions } from "react-native"
import { translate } from "../../../i18n"
import React, { FC } from "react"
import EStyleSheet from "react-native-extended-stylesheet"
import { typography } from "../../../theme"
import { SvgXml } from "react-native-svg"
import { everTeamsLogoDarkTheme } from "../../../components/svgs/icons"

interface Props {
	withTeam: boolean
	screenStatus: { screen: number; animation: boolean }
	workspaceScreen: boolean
}
const LoginHeader: FC<Props> = ({ withTeam, screenStatus, workspaceScreen }) => {
	return (
		<>
			<SvgXml xml={everTeamsLogoDarkTheme} />
			{withTeam ? (
				<View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
					{workspaceScreen ? (
						<View style={{ justifyContent: "center", alignItems: "center" }}>
							<Text style={styles.screenTitle}>{translate("loginScreen.enterDetails3")}</Text>
							<Text style={styles.smalltext}>{translate("loginScreen.hintDetails3")}</Text>
						</View>
					) : (
						<View style={{ justifyContent: "center", alignItems: "center" }}>
							<Text style={styles.screenTitle}>{translate("loginScreen.enterDetails2")}</Text>
							<Text style={styles.smalltext}>{translate("loginScreen.hintDetails2")}</Text>
						</View>
					)}
				</View>
			) : screenStatus.screen !== 3 ? (
				<View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
					<Text style={styles.screenTitle}>{translate("loginScreen.enterDetails")}</Text>
					<Text style={styles.smalltext}>{translate("loginScreen.hintDetails")}</Text>
				</View>
			) : (
				<View style={{ width: "100%", justifyContent: "center", alignItems: "center" }}>
					<Text style={styles.screenTitle}>{translate("loginScreen.joinTeam")}</Text>
					<Text style={styles.smalltext}>{translate("loginScreen.joinTeamHint")}</Text>
				</View>
			)}
		</>
	)
}

export default LoginHeader

const { width } = Dimensions.get("window")

const styles = EStyleSheet.create({
	form: {
		position: "absolute",
		display: "flex",
		flex: 1,
		width: "90%",
		top: "-32%",
		padding: "1.5rem",
		alignSelf: "center",
		backgroundColor: "#fff",
		alignItems: "center",
		borderRadius: "1rem",
		justifyContent: "flex-start",
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.1)",
		elevation: 10,
		shadowColor: "rgba(0,0,0,0.1)",
		shadowOffset: { width: 10, height: 10 },
		shadowOpacity: 5,
		shadowRadius: 9,
		zIndex: 1000,
	},
	text: {
		fontSize: "1.5rem",
		marginBottom: "2rem",
		color: "#1A1C1E",
		width: "100%",
		textAlign: "center",
		fontFamily: typography.primary.semiBold,
	},
	buttonsView: {
		width: "100%",
		display: "flex",
		marginTop: "2rem",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
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
	inputStyleOverride: {
		height: "3.3rem",
		borderColor: "rgba(0,0,0,0.1)",
		backgroundColor: "#FFFFFF",
		paddingVertical: "0.43rem",
		paddingHorizontal: "0.6rem",
		borderRadius: "0.6rem",
	},
	textField: {
		width: "100%",
		borderRadius: "1.25rem",
	},
	buttonText: {
		fontSize: "2rem",
		fontFamily: typography.primary.semiBold,
		color: "#3826A6",
	},
	joinExistedText: {
		fontSize: "0.75rem",
		fontFamily: typography.primary.semiBold,
		color: "#3826A6",
	},
	backButtonText: {
		fontSize: "0.87rem",
		fontFamily: typography.primary.semiBold,
		color: "#3826A6",
	},
	tapButtonText: {
		color: "#fff",
		fontFamily: typography.primary.semiBold,
		fontSize: "1rem",
	},
	inputInviteTitle: {
		fontSize: "0.87rem",
		marginTop: "1.8rem",
		marginBottom: "1rem",
		fontFamily: typography.primary.medium,
		color: "#B1AEBC",
	},
	resendText: {
		fontSize: "0.87rem",
		color: "#B1AEBC",
		marginTop: "1rem",
		fontFamily: typography.primary.medium,
	},
	bottomSectionTxt: {
		flex: 3,
		fontSize: "0.7rem",
		fontFamily: typography.primary.medium,
		color: "rgba(126, 121, 145, 0.7)",
	},
	loading: {
		position: "absolute",
		bottom: "20%",
		right: 140,
	},
	screenTitle: {
		marginTop: "2rem",
		fontSize: "1.5rem",
		textAlign: "center",
		width: "100%",
		color: "#fff",
		fontFamily: typography.primary.bold,
		fontWeight: "700",
	},
	smalltext: {
		marginTop: "1rem",
		fontSize: "0.7rem",
		width: "100%",
		textAlign: "center",
		color: "#fff",
		fontFamily: typography.secondary.normal,
		fontWeight: "400",
	},
	verifyError: {
		color: "red",
		margin: 10,
	},
})
