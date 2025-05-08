/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Dimensions, View, ViewStyle } from 'react-native';

// Components
import { Screen } from '../../components';
import { AppStackScreenProps } from '../../navigators';
import { spacing, useAppTheme } from '../../theme';
import FillTeamNameForm from './components/fill-team-name-form';
import { useAuthenticationTeam } from '../../services/hooks/features/use-authentication-team';
import FillUserInfoForm from './components/fill-user-info-form';
import EmailVerificationForm from './components/email-verification-form';
import PassCode from './components/pass-code';
import LoginHeader from './components/login-header';
import LoginBottom from './components/login-bottom';

interface LoginScreenProps extends AppStackScreenProps<'Login'> {}

const { width } = Dimensions.get('window');

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

	const { colors } = useAppTheme();

	const [isWorkspaceScreen, setIsWorkspaceScreen] = useState<boolean>(false);

	return (
		<Screen
			contentContainerStyle={{ ...$screenContentContainer, backgroundColor: '#282149' }}
			backgroundColor={'#282149'}
			statusBarStyle={'light'}
			safeAreaEdges={['top']}
			KeyboardAvoidingViewProps={{}}
		>
			<View style={$header}>
				<LoginHeader withTeam={withteam} screenStatus={screenstatus} workspaceScreen={isWorkspaceScreen} />
			</View>
			<View style={{ ...$bottom, backgroundColor: colors.background2 }}>
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
	);
});

// Styles

const $screenContentContainer: ViewStyle = {
	paddingHorizontal: spacing.large,
	height: '100%',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between'
};

const $header: ViewStyle = {
	width: '100%',
	display: 'flex',
	paddingTop: 15,
	flex: 1.4,
	justifyContent: 'flex-start'
};

const $bottom: ViewStyle = {
	width,
	backgroundColor: '#fff',
	flex: 2
};
