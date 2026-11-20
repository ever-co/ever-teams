import React, { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, View, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Components
import { Screen } from '../../components';
import { AppStackScreenProps } from '../../navigators';
import { spacing, useWebTheme } from '../../theme';
import FillTeamNameForm from './components/fill-team-name-form';
import { useAuthenticationTeam } from '../../services/hooks/features/use-authentication-team';
import FillUserInfoForm from './components/fill-user-info-form';
import EmailVerificationForm from './components/email-verification-form';
import PassCode from './components/pass-code';
import LoginHeader from './components/login-header';
import LoginBottom from './components/login-bottom';
import { loginLogoOf } from './components/login-heading';

interface LoginScreenProps extends AppStackScreenProps<'Login'> {}

/** The status bar's icons: light over the dark page, dark over the light one. */
function statusBarStyleOf(isDark: boolean): 'light' | 'dark' {
	if (isDark) {
		return 'light';
	}
	return 'dark';
}

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
		verifyEmailAndCodeOrAcceptInvite
	} = useAuthenticationTeam();

	const theme = useWebTheme();
	const isDark = theme.scheme === 'dark';

	const [isWorkspaceScreen, setIsWorkspaceScreen] = useState<boolean>(false);

	const heading = <LoginHeader withTeam={withteam} screenStatus={screenstatus} workspaceScreen={isWorkspaceScreen} />;
	const showsTeamName = screenstatus.screen === 1 && !withteam;
	const showsUserInfo = !showsTeamName && screenstatus.screen === 2;
	const showsEmailVerification = !showsTeamName && screenstatus.screen === 3;
	const showsPassCode = !showsTeamName && !showsUserInfo && !showsEmailVerification;

	return (
		<Screen
			contentContainerStyle={{ ...$screenContentContainer, backgroundColor: theme.colors.background }}
			backgroundColor={theme.colors.background}
			statusBarStyle={statusBarStyleOf(isDark)}
			safeAreaEdges={['top']}
			KeyboardAvoidingViewProps={{}}
		>
			<View style={$page}>
				<SvgXml xml={loginLogoOf(theme.scheme, Platform.OS === 'android')} />
				{showsTeamName && (
					<FillTeamNameForm
						heading={heading}
						setWithTeam={setWithTeam}
						setScreenStatus={setScreenStatus}
						isLoading={isLoading}
						errors={errors}
					/>
				)}
				{showsUserInfo && (
					<FillUserInfoForm
						heading={heading}
						createNewTeam={createNewTeam}
						isLoading={isLoading}
						errors={errors}
						setScreenStatus={setScreenStatus}
					/>
				)}
				{showsEmailVerification && (
					<EmailVerificationForm
						heading={heading}
						isLoading={isLoading}
						verificationError={verificationError}
						verifyEmailByCode={verifyEmailByCode}
						setScreenStatus={setScreenStatus}
						resendEmailVerificationCode={resendEmailVerificationCode}
					/>
				)}
				{showsPassCode && (
					<PassCode
						heading={heading}
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
			</View>
			<LoginBottom />
		</Screen>
	);
});

// Styles

const $screenContentContainer: ViewStyle = {
	paddingHorizontal: spacing.large,
	height: '100%',
	display: 'flex',
	justifyContent: 'space-between'
};

const $page: ViewStyle = {
	gap: 32,
	paddingTop: 24,
	width: '100%'
};
