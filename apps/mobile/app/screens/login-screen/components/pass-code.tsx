import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';

import { translate } from '../../../i18n';
import { typography, useWebTheme } from '../../../theme';
import { useStores } from '../../../models';
import { EMAIL_REGEX } from '../../../helpers/regex';
import UserTenants from './user-tenants';
import { IWorkspace, VerificationResponse } from '../../../services/interfaces/IAuthentication';
import { CodeInputField } from '../../../components/code-field';
import { isCompleteEmailedCode } from '../../../helpers/emailed-code';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SignInStep } from './sign-in-step';
import { SignInField } from './sign-in-field';
import { authLabelLookOf, authQuietLinkLookOf } from '../../../../src/theme/auth-look';

interface Props {
	isLoading: boolean;
	errors: any;
	setWithTeam: (value: boolean) => unknown;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	getAuthCode: () => unknown;
	joinError: string | null;
	verifyEmailAndCodeOrAcceptInvite: () => unknown;
	signInWorkspace: () => unknown;
	setIsWorkspaceScreen: React.Dispatch<React.SetStateAction<boolean>>;
	/** The step's title and its line, drawn above the fields. */
	heading?: ReactNode;
}
export type defaultUserInfoType = {
	defaultUserId: string;
	defaultUserTenantId: string;
};

type SignInStepName = 'Email' | 'Code' | 'Tenant';

/** Whether the step's field holds what Continue sends: an e-mail, a whole code, or a chosen workspace. */
function isStepValid(step: SignInStepName, isValid: { step1: boolean; step2: boolean; step3: boolean }): boolean {
	if (step === 'Email') {
		return isValid.step1;
	}
	if (step === 'Code') {
		return isValid.step2;
	}
	return isValid.step3;
}

const PassCode: FC<Props> = observer(
	({
		isLoading,
		errors,
		setScreenStatus,
		setWithTeam,
		getAuthCode,
		joinError,
		verifyEmailAndCodeOrAcceptInvite,
		signInWorkspace,
		setIsWorkspaceScreen,
		heading
	}) => {
		const theme = useWebTheme();
		const label = [styles.label, authLabelLookOf(theme)];
		const quietLink = authQuietLinkLookOf(theme);
		const errorText = [styles.error, { color: theme.colors['destructive-ink'] }];
		const {
			authenticationStore: { authEmail, setAuthEmail, setAuthInviteCode, authInviteCode, setTempAuthToken },
			teamStore: { activeTeamId, setActiveTeamId }
		} = useStores();

		const authTeamInput = useRef<TextInput | null>(null);
		// A request for the code under way: Continue pressed again meanwhile sends no second one
		const isSendingCode = useRef(false);
		const [step, setStep] = useState<SignInStepName>('Email');
		const [isValid, setIsValid] = useState<{ step1: boolean; step2: boolean; step3: boolean }>({
			step1: false,
			step2: false,
			step3: false
		});
		const [selectedWorkspace, setSelectedWorkspace] = useState<number>(null);
		const [workspaceData, setWorkspaceData] = useState(null);
		const [defaultUserInfo, setDefaultUserInfo] = useState<defaultUserInfoType>({
			defaultUserId: '',
			defaultUserTenantId: ''
		});

		const onNextStep = async () => {
			if (step === 'Email') {
				if (isSendingCode.current) {
					return;
				}
				isSendingCode.current = true;
				// The code step opens once the API has answered: the code the person is asked for exists by then
				try {
					await getAuthCode();
				} finally {
					isSendingCode.current = false;
				}
				setStep('Code');
				setAuthInviteCode('');
				return;
			}

			if (step === 'Code') {
				const response: VerificationResponse = await verifyEmailAndCodeOrAcceptInvite();

				setTimeout(() => {
					if (
						!isLoading &&
						response.data?.workspaces &&
						(response.data?.workspaces.length > 1 || response.data?.workspaces[0].current_teams.length > 1)
					) {
						setWorkspaceData(response.data.workspaces);
						setAuthInviteCode('');
						setActiveTeamId('');
						setStep('Tenant');
					} else if (
						!isLoading &&
						response.data?.workspaces &&
						response.data?.workspaces.length === 1 &&
						response.data?.workspaces[0].current_teams.length <= 1
					) {
						// One workspace with one team, or with none yet (a confirmed sign-up: the sign-in sets it up)
						// if there is 1 workspace and 1 team -> log the user
						setTempAuthToken(response.data?.workspaces[0]?.token);
						setActiveTeamId(response.data?.workspaces[0].current_teams[0]?.team_id ?? '');

						// login
						// @ts-ignore
						signInWorkspace({ signinAuthToken: response.data?.workspaces[0]?.token });
					}
				}, 1000);
			}
			if (step === 'Tenant') {
				await AsyncStorage.setItem('defaultUserInfo', JSON.stringify(defaultUserInfo));
				signInWorkspace();
			}
		};
		const onPrevStep = () => {
			if (step === 'Email') {
				setWithTeam(false);
				setScreenStatus({
					screen: 1,
					animation: true
				});
				return;
			}

			if (step === 'Code') {
				setStep('Email');
			}
			if (step === 'Tenant') {
				setStep('Code');
				setActiveTeamId('');
			}
		};

		const onChangeEmail = (text: string) => {
			setAuthEmail(text);
			if (EMAIL_REGEX.test(text)) {
				setIsValid({
					...isValid,
					step1: true
				});
			} else {
				setIsValid({
					...isValid,
					step1: false
				});
			}
		};

		const onChangeAuthCode = (text: string) => {
			setAuthInviteCode(text);

			if (isCompleteEmailedCode(text)) {
				setIsValid({
					...isValid,
					step2: true
				});
			} else {
				setIsValid({
					...isValid,
					step2: false
				});
			}
		};

		useEffect(() => {
			if (step === 'Email' && EMAIL_REGEX.test(authEmail)) {
				setIsValid({
					...isValid,
					step1: true
				});
				setIsWorkspaceScreen(false);
			}

			if (step === 'Code' && isCompleteEmailedCode(authInviteCode)) {
				setIsValid({
					...isValid,
					step2: true
				});
				setIsWorkspaceScreen(false);
			}
			if (step === 'Tenant') {
				setIsWorkspaceScreen(true);
			}
		}, [step]);

		const showsCodeDestination = Boolean(authEmail);

		return (
			<SignInStep
				heading={heading}
				onBack={() => onPrevStep()}
				backTestID="sign-in-back"
				submit={{
					label: translate('loginScreen.tapContinue'),
					onPress: () => onNextStep(),
					disabled: !isStepValid(step, isValid),
					isLoading,
					testID: 'sign-in-continue'
				}}
			>
				{step === 'Email' && (
					<SignInField
						label={translate('loginScreen.inviteStepLabel')}
						placeholder={translate('loginScreen.emailFieldPlaceholder')}
						ref={authTeamInput}
						testID="sign-in-email"
						value={authEmail}
						onChangeText={onChangeEmail}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!isLoading}
						helper={errors?.authEmail}
						status={errors?.authEmail ? 'error' : undefined}
						onSubmitEditing={() => authTeamInput.current?.focus()}
					/>
				)}
				{step === 'Code' && (
					<View>
						<Text style={label}>{translate('loginScreen.inviteCodeFieldLabel')}</Text>
						{showsCodeDestination && (
							<Text numberOfLines={2} style={[styles.hint, { color: theme.colors['muted-foreground'] }]}>
								{translate('loginScreen.codeSentTo')}{' '}
								<Text style={[styles.email, { color: theme.colors.foreground }]}>{authEmail}</Text>
							</Text>
						)}
						<CodeInputField editable onChange={onChangeAuthCode} defaultValue={authInviteCode} />
						{joinError ? <Text style={errorText}>{joinError}</Text> : null}
						<TouchableOpacity
							testID="sign-in-resend-code"
							onPress={() => getAuthCode()}
							style={styles.resend}
						>
							<Text style={quietLink}>
								{translate('loginScreen.codeNotReceived')}{' '}
								<Text style={[styles.link, { color: theme.colors['primary-ink'] }]}>
									{translate('loginScreen.sendCode')}
								</Text>
							</Text>
						</TouchableOpacity>
					</View>
				)}
				{step === 'Tenant' && (
					<View style={styles.tenantsContainer}>
						<Text style={label}>{translate('loginScreen.selectWorkspaceFieldLabel')}</Text>

						{/* The page scrolls too: Android scrolls a list inside it only when it nests its scrolling */}
						<FlatList
							data={workspaceData}
							nestedScrollEnabled
							showsVerticalScrollIndicator={false}
							renderItem={({ item, index }: { item: IWorkspace; index: number }) => (
								<UserTenants
									key={index}
									index={index}
									data={item}
									activeTeamId={activeTeamId}
									setActiveTeamId={setActiveTeamId}
									setDefaultUserInfo={setDefaultUserInfo}
									selectedWorkspace={selectedWorkspace}
									setSelectedWorkspace={setSelectedWorkspace}
									isValid={isValid}
									setIsValid={setIsValid}
									setTempAuthToken={setTempAuthToken}
								/>
							)}
						/>
						{/* A sign-in error of the chosen workspace (not loaded, setup not complete) shows here too */}
						{joinError ? <Text style={errorText}>{joinError}</Text> : null}
					</View>
				)}
			</SignInStep>
		);
	}
);

export default PassCode;

const styles = StyleSheet.create({
	email: {
		fontFamily: typography.primary.semiBold
	},
	error: {
		fontSize: 13,
		marginTop: 10
	},
	hint: {
		fontSize: 13,
		marginBottom: 16
	},
	label: {
		fontFamily: typography.primary.medium
	},
	link: {
		fontFamily: typography.primary.medium
	},
	resend: {
		alignSelf: 'flex-start',
		marginTop: 16
	},
	tenantsContainer: {
		width: '100%',
		minHeight: 202,
		maxHeight: 400
	}
});
