/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC } from 'react';
import { View, Text, Dimensions, ViewStyle, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import EStyleSheet from 'react-native-extended-stylesheet';
import { Feather } from '@expo/vector-icons';

// Components
import { observer } from 'mobx-react-lite';
import { translate } from '../../../i18n';
import { Button } from '../../../components';
import { spacing, typography, useAppTheme } from '../../../theme';
import { useStores } from '../../../models';
import { CodeInput } from '../../../components/CodeInput';

interface Props {
	isLoading: boolean;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	verificationError: string | null;
	resendEmailVerificationCode: () => unknown;
	verifyEmailByCode: () => unknown;
}

const EmailVerificationForm: FC<Props> = observer(
	({ isLoading, setScreenStatus, verificationError, verifyEmailByCode, resendEmailVerificationCode }) => {
		const { colors, dark } = useAppTheme();
		const {
			authenticationStore: { setAuthConfirmCode }
		} = useStores();

		return (
			<Animatable.View
				animation={'zoomIn'}
				delay={100}
				style={{
					...styles.form,
					backgroundColor: colors.background,
					elevation: !dark && 10,
					shadowColor: !dark && 'rgba(0,0,0,0.1)',
					shadowOffset: !dark && { width: 10, height: 10 },
					shadowOpacity: !dark && 5,
					shadowRadius: !dark && 9
				}}
			>
				<Text style={styles.text}>{translate('loginScreen.step3Title')}</Text>
				<View>
					<CodeInput onChange={setAuthConfirmCode} editable={!isLoading} />
					{verificationError ? <Text style={styles.verifyError}>{verificationError}</Text> : null}
					<TouchableOpacity style={styles.resendWrapper} onPress={() => resendEmailVerificationCode()}>
						<Text style={styles.resendText}>
							{translate('loginScreen.codeNotReceived')}
							{translate('loginScreen.sendCode').substring(0, 2)}
							<Text style={{ color: colors.primary }}>
								{translate('loginScreen.sendCode').substring(2)}
							</Text>
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.buttonsView}>
					<TouchableOpacity
						style={{
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center',
							width: 65
						}}
						onPress={() =>
							setScreenStatus({
								screen: 2,
								animation: true
							})
						}
					>
						<Feather name="arrow-left" size={24} color={dark ? colors.primary : '#3826A6'} />
						<Text style={{ ...styles.backButtonText, color: colors.primary }}>
							{translate('common.back')}
						</Text>
					</TouchableOpacity>
					<Button
						style={[
							$tapButton,
							{
								width: width / 2.1,
								opacity: isLoading ? 0.5 : 1,
								backgroundColor: colors.secondary
							}
						]}
						textStyle={styles.tapButtonText}
						onPress={() => verifyEmailByCode()}
					>
						<Text>{translate('loginScreen.tapJoin')}</Text>
					</Button>
					<ActivityIndicator style={styles.loading} animating={isLoading} size={'small'} color={'#fff'} />
				</View>
			</Animatable.View>
		);
	}
);

export default EmailVerificationForm;

const { width } = Dimensions.get('window');

const $tapButton: ViewStyle = {
	marginTop: spacing.extraSmall,
	width: width / 3,
	borderRadius: 10,
	backgroundColor: '#3826A6'
};

const styles = EStyleSheet.create({
	form: {
		position: 'absolute',
		display: 'flex',
		flex: 1,
		width: '90%',
		top: '-32%',
		padding: '1.5rem',
		alignSelf: 'center',
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
		color: '#1A1C1E',
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
	textField: {
		width: '100%',
		borderRadius: '1.25rem'
	},
	backButtonText: {
		fontSize: '0.87rem',
		fontFamily: typography.primary.semiBold
	},
	tapButtonText: {
		color: '#fff',
		fontFamily: typography.primary.semiBold,
		fontSize: '1rem'
	},
	resendText: {
		fontSize: '0.87rem',
		color: '#B1AEBC',
		marginTop: '1rem',
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
