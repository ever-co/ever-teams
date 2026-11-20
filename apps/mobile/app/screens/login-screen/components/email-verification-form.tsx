import React, { FC, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Components
import { observer } from 'mobx-react-lite';
import { translate } from '../../../i18n';
import { typography, useWebTheme } from '../../../theme';
import { useStores } from '../../../models';
import { CodeInput } from '../../../components/code-input';
import { SignInStep } from './sign-in-step';
import { authLabelLookOf, authQuietLinkLookOf } from '../../../../src/theme/auth-look';

interface Props {
	isLoading: boolean;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	verificationError: string | null;
	resendEmailVerificationCode: () => unknown;
	verifyEmailByCode: () => unknown;
	/** The step's title and its line, drawn above the fields. */
	heading?: ReactNode;
}

const EmailVerificationForm: FC<Props> = observer(
	({ isLoading, setScreenStatus, verificationError, verifyEmailByCode, resendEmailVerificationCode, heading }) => {
		const theme = useWebTheme();
		const {
			authenticationStore: { setAuthConfirmCode }
		} = useStores();

		return (
			<SignInStep
				heading={heading}
				onBack={() =>
					setScreenStatus({
						screen: 2,
						animation: true
					})
				}
				submit={{
					label: translate('loginScreen.tapJoin'),
					onPress: () => verifyEmailByCode(),
					disabled: false,
					isLoading
				}}
			>
				<View>
					<Text style={[styles.label, authLabelLookOf(theme)]}>{translate('loginScreen.step3Title')}</Text>
					<CodeInput onChange={setAuthConfirmCode} editable={!isLoading} />
					{verificationError ? (
						<Text style={[styles.error, { color: theme.colors['destructive-ink'] }]}>
							{verificationError}
						</Text>
					) : null}
					<TouchableOpacity style={styles.resend} onPress={() => resendEmailVerificationCode()}>
						<Text style={authQuietLinkLookOf(theme)}>
							{translate('loginScreen.codeNotReceived')}{' '}
							<Text style={[styles.link, { color: theme.colors['primary-ink'] }]}>
								{translate('loginScreen.sendCode')}
							</Text>
						</Text>
					</TouchableOpacity>
				</View>
			</SignInStep>
		);
	}
);

export default EmailVerificationForm;

const styles = StyleSheet.create({
	error: {
		fontSize: 13,
		marginTop: 10
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
	}
});
