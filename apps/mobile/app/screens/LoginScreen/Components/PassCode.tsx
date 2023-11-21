/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useEffect, useRef, useState } from 'react';
import * as Animatable from 'react-native-animatable';
import EStyleSheet from 'react-native-extended-stylesheet';
import { View, Text, Dimensions, TextInput, ViewStyle, TouchableOpacity, FlatList } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';

import { translate } from '../../../i18n';
import { Button, TextField } from '../../../components';
import { spacing, typography, useAppTheme } from '../../../theme';
import { useStores } from '../../../models';
import { GLOBAL_STYLE as GS } from '../../../../assets/ts/styles';
import { EMAIL_REGEX } from '../../../helpers/regex';
import UserTenants from './UserTenants';
import { IWorkspace, VerificationResponse } from '../../../services/interfaces/IAuthentication';
import { CodeInputField } from '../../../components/CodeField';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
	isLoading: boolean;
	errors: any;
	setWithTeam: (value: boolean) => unknown;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	getAuthCode: () => unknown;
	joinError: string;
	verifyEmailAndCodeOrAcceptInvite: () => unknown;
	signInWorkspace: () => unknown;
	setIsWorkspaceScreen: React.Dispatch<React.SetStateAction<boolean>>;
}
export type defaultUserInfoType = {
	defaultUserId: string;
	defaultUserTenantId: string;
};

const { width } = Dimensions.get('window');
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
		setIsWorkspaceScreen
	}) => {
		const { colors, dark } = useAppTheme();
		const {
			authenticationStore: { authEmail, setAuthEmail, setAuthInviteCode, authInviteCode, setTempAuthToken },
			teamStore: { activeTeamId, setActiveTeamId }
		} = useStores();

		const authTeamInput = useRef<TextInput>();
		const [step, setStep] = useState<'Email' | 'Code' | 'Tenant'>('Email');
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
				getAuthCode();
				setTimeout(() => {
					if (!isLoading) {
						setStep('Code');
						setAuthInviteCode('');
					}
				}, 1000);
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
						response.data?.workspaces[0].current_teams.length === 1
					) {
						// if there is 1 workspace and 1 team -> log the user
						setTempAuthToken(response.data?.workspaces[0]?.token);
						setActiveTeamId(response.data?.workspaces[0].current_teams[0]?.team_id);

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

			if (text.length === 6) {
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

			if (step === 'Code' && authInviteCode.length === 6) {
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

		return (
			<Animatable.View
				animation={'zoomIn'}
				delay={100}
				style={{
					...styles.form,
					backgroundColor: colors.background,
					...(!dark && GS.shadowSm)
				}}
			>
				{step === 'Email' ? (
					<>
						<Text style={{ ...styles.text, color: colors.primary }}>
							{translate('loginScreen.inviteStepLabel')}
						</Text>
						<TextField
							placeholder={translate('loginScreen.emailFieldPlaceholder')}
							containerStyle={styles.textField}
							placeholderTextColor={dark ? '#7B8089' : '#28204866'}
							inputWrapperStyle={{
								...styles.inputStyleOverride,
								backgroundColor: colors.background,
								borderColor: colors.border
							}}
							ref={authTeamInput}
							value={authEmail}
							onChangeText={onChangeEmail}
							autoCapitalize="none"
							autoCorrect={false}
							editable={!isLoading}
							helper={errors?.authEmail}
							status={errors?.authEmail ? 'error' : undefined}
							onSubmitEditing={() => authTeamInput.current?.focus()}
						/>
					</>
				) : step === 'Code' ? (
					<View>
						<Text style={{ ...styles.text, alignSelf: 'center', color: colors.primary }}>
							{translate('loginScreen.inviteCodeFieldLabel')}
						</Text>
						<CodeInputField editable onChange={onChangeAuthCode} defaultValue={authInviteCode} />
						{joinError ? <Text style={styles.verifyError}>{joinError}</Text> : null}
						<TouchableOpacity onPress={() => getAuthCode()}>
							<Text style={styles.resendText}>
								{translate('loginScreen.codeNotReceived')}
								{translate('loginScreen.sendCode').substring(0, 2)}
								<Text style={{ color: colors.secondary }}>
									{translate('loginScreen.sendCode').substring(2)}
								</Text>
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.tenantsContainer}>
						<Text style={{ ...styles.text, alignSelf: 'center', color: colors.primary }}>
							{translate('loginScreen.selectWorkspaceFieldLabel')}
						</Text>

						<FlatList
							data={workspaceData}
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
					</View>
				)}
				<View style={styles.buttonsView}>
					<TouchableOpacity
						style={{
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center',
							width: 65
						}}
						onPress={() => onPrevStep()}
					>
						<Feather name="arrow-left" size={24} color={dark ? colors.primary : '#3826A6'} />
						<Text
							style={[styles.backButtonText, { color: dark ? colors.primary : '#282048', fontSize: 14 }]}
						>
							{translate('common.back')}
						</Text>
					</TouchableOpacity>
					<Button
						style={[
							$tapButton,
							{
								width: width / 2.1,
								opacity:
									isLoading ||
									(step === 'Email' && !isValid.step1) ||
									(step === 'Code' && !isValid.step2) ||
									(step === 'Tenant' && !isValid.step3)
										? 0.5
										: 1,
								backgroundColor: colors.secondary,
								borderWidth: 0
							}
						]}
						textStyle={styles.tapButtonText}
						onPress={() => onNextStep()}
						disabled={
							(step === 'Email' && !isValid.step1) ||
							(step === 'Code' && !isValid.step2) ||
							(step === 'Tenant' && !isValid.step3)
						}
					>
						<Text>{translate('loginScreen.tapContinue')}</Text>
					</Button>
					<ActivityIndicator style={styles.loading} animating={isLoading} size={'small'} color={'#fff'} />
				</View>
			</Animatable.View>
		);
	}
);

export default PassCode;

const $tapButton: ViewStyle = {
	marginTop: spacing.extraSmall,
	width: width / 3,
	borderRadius: 10,
	backgroundColor: '#3826A6'
};

const styles = EStyleSheet.create({
	tenantsContainer: {
		width: '100%',
		// height: 220,
		minHeight: 202,
		maxHeight: 400
	},
	form: {
		position: 'absolute',
		display: 'flex',
		flex: 1,
		width: '90%',
		top: '-32%',
		padding: '1.5rem',
		alignSelf: 'center',
		backgroundColor: '#fff',
		alignItems: 'center',
		borderRadius: '1rem',
		justifyContent: 'flex-start',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.1)',
		zIndex: 1000
	},
	text: {
		fontSize: '1.5rem',
		marginBottom: '2rem',
		width: '100%',
		textAlign: 'center',
		fontFamily: typography.primary.semiBold
	},
	buttonsView: {
		width: '100%',
		display: 'flex',
		marginTop: '2rem',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	inputStyleOverride: {
		height: '3.3rem',
		borderColor: 'rgba(0,0,0,0.1)',
		backgroundColor: '#FFFFFF',
		paddingVertical: '0.43rem',
		paddingHorizontal: '0.6rem',
		borderRadius: '0.6rem'
	},
	textField: {
		width: '100%',
		borderRadius: '1.25rem'
	},
	backButtonText: {
		fontSize: '0.87rem',
		fontFamily: typography.primary.semiBold,
		color: '#3826A6'
	},
	tapButtonText: {
		color: '#fff',
		fontFamily: typography.primary.semiBold,
		fontSize: '1rem'
	},
	inputInviteTitle: {
		fontSize: '0.87rem',
		marginTop: '1.8rem',
		marginBottom: '1rem',
		fontFamily: typography.primary.medium,
		color: '#B1AEBC'
	},
	resendText: {
		fontSize: '0.87rem',
		color: '#B1AEBC',
		marginTop: '1.2rem',
		fontFamily: typography.primary.medium
	},
	loading: {
		position: 'absolute',
		bottom: '20%',
		right: '47%'
	},
	verifyError: {
		color: 'red',
		margin: 10
	}
});
