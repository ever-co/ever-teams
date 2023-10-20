/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { Dimensions, View, ViewStyle } from "react-native"

// Components
import { Screen } from "../../components"
import { AppStackScreenProps } from "../../navigators"
import { spacing } from "../../theme"
import FillTeamNameForm from "./Components/FillTeamNameForm"
import { useAuthenticationTeam } from "../../services/hooks/features/useAuthenticationTeam"
import FillUserInfoForm from "./Components/FillUserInfoForm"
import EmailVerificationForm from "./Components/EmailVerificationForm"
import PassCode from "./Components/PassCode"
import LoginHeader from "./Components/LoginHeader"
import LoginBottom from "./Components/LoginBottom"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

const { width } = Dimensions.get("window")

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
	const {
		setScreenStatus,
		screenstatus,
		withteam,
		setWithTeam,
		errors,
		isLoading,
		createNewTeam,
		verificationError,
		verifyEmailByCode,
		resendEmailVerificationCode,
		joinError,
		signInWorkspace,
		getAuthCode,
		verifyEmailAndCodeOrAcceptInvite,
	} = useAuthenticationTeam()

	const [isWorkspaceScreen, setIsWorkspaceScreen] = useState<boolean>(false)

	return (
		<Screen
			contentContainerStyle={{ ...$screenContentContainer, backgroundColor: "#282149" }}
			backgroundColor={"#282149"}
			statusBarStyle={"light"}
			safeAreaEdges={["top"]}
			KeyboardAvoidingViewProps={{}}
		>
			<View style={$header}>
				<LoginHeader
					withTeam={withteam}
					screenStatus={screenstatus}
					workspaceScreen={isWorkspaceScreen}
				/>
			</View>
			<View style={$bottom}>
				{screenstatus.screen === 1 && !withteam ? (
					<FillTeamNameForm
						setWithTeam={setWithTeam}
						setScreenStatus={setScreenStatus}
						isLoading={isLoading}
						errors={errors}
					/>
				) : screenstatus.screen === 2 ? (
					<FillUserInfoForm
						createNewTeam={createNewTeam}
						isLoading={isLoading}
						errors={errors}
						setScreenStatus={setScreenStatus}
					/>
				) : screenstatus.screen === 3 ? (
					<EmailVerificationForm
						isLoading={isLoading}
						verificationError={verificationError}
						verifyEmailByCode={verifyEmailByCode}
						setScreenStatus={setScreenStatus}
						resendEmailVerificationCode={resendEmailVerificationCode}
					/>
				) : (
					<PassCode
						joinError={joinError}
						signInWorkspace={signInWorkspace}
						getAuthCode={getAuthCode}
						verifyEmailAndCodeOrAcceptInvite={verifyEmailAndCodeOrAcceptInvite}
						setScreenStatus={setScreenStatus}
						errors={errors}
						setWithTeam={setWithTeam}
						isLoading={isLoading}
						setIsWorkspaceScreen={setIsWorkspaceScreen}
					/>
				)}
				<LoginBottom />
			</View>
		</Screen>
	)
})

// Styles

const $screenContentContainer: ViewStyle = {
	paddingHorizontal: spacing.large,
	height: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
}

const $header: ViewStyle = {
	width: "100%",
	display: "flex",
	paddingTop: 15,
	flex: 1.4,
	justifyContent: "flex-start",
}

const $bottom: ViewStyle = {
	width,
	backgroundColor: "#fff",
	flex: 2,
}
