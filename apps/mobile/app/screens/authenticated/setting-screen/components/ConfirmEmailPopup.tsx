/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useCallback, useState } from 'react';
import {
	View,
	ViewStyle,
	Modal,
	Text,
	Animated,
	StyleSheet,
	TouchableWithoutFeedback,
	TouchableOpacity
} from 'react-native';
import { colors, typography, useAppTheme } from '../../../../theme';
import { CodeInput } from '../../../../components/CodeInput';
import { Button } from '../../../../components';
import { translate } from '../../../../i18n';
import { useUser } from '../../../../services/hooks/features/useUser';
import useAuthenticateUser from '../../../../services/hooks/features/useAuthentificateUser';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	newEmail: string;
}

const ModalPopUp = ({ visible, children }) => {
	const [showModal, setShowModal] = React.useState(visible);
	const scaleValue = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		toggleModal();
	}, [visible]);
	const toggleModal = () => {
		if (visible) {
			setShowModal(true);
			Animated.spring(scaleValue, {
				toValue: 1,
				useNativeDriver: true
			}).start();
		} else {
			setTimeout(() => setShowModal(false), 200);
			Animated.timing(scaleValue, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true
			}).start();
		}
	};
	return (
		<Modal animationType="fade" transparent visible={showModal}>
			<TouchableWithoutFeedback>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const ConfirmEmailPopup: FC<Props> = function ConfirmEmailPopup({ visible, onDismiss, newEmail }) {
	const { colors, dark } = useAppTheme();
	const { resendVerifyCode, verifyChangeEmail } = useUser();
	const [confirmCode, setConfirmCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const { updateUserFromAPI } = useAuthenticateUser();

	const onVerifyEmail = useCallback(() => {
		if (confirmCode && confirmCode.length === 6) {
			setLoading(true);
			verifyChangeEmail(confirmCode).then(async (e) => {
				const { response } = e;
				if (response.ok && response.status === 202) {
					updateUserFromAPI();
					onDismiss();
				} else {
					setError('Invalid code');
				}
			});
			setLoading(false);
		}
	}, [confirmCode]);

	return (
		<ModalPopUp visible={visible}>
			<View style={{ ...styles.container, backgroundColor: colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>
					{translate('loginScreen.inviteCodeFieldLabel')}
				</Text>
				<CodeInput onChange={setConfirmCode} editable={true} />
				{error && <Text style={styles.errorText}>{translate('loginScreen.invalidConfirmCode')}</Text>}
				<Text style={{ ...styles.text, marginTop: 10 }}>{translate('loginScreen.securityCodeSent')}</Text>
				<View style={styles.wrapResendText}>
					<Text style={styles.text}>
						{translate('loginScreen.codeNotReceived') + ' '}
						{translate('loginScreen.sendCode').substring(0, 2)}
					</Text>
					<TouchableOpacity onPress={() => resendVerifyCode(newEmail)}>
						<Text style={{ color: colors.secondary }}>
							{translate('loginScreen.sendCode').substring(2)}
						</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.wrapButtons}>
					<Button
						style={{ ...styles.btnStyle, backgroundColor: dark ? '#3D4756' : colors.background }}
						onPress={() => onDismiss()}
					>
						<Text style={{ ...styles.btnTxt, color: colors.primary }}>{translate('common.discard')}</Text>
					</Button>

					<Button
						style={{
							...styles.btnStyle,
							backgroundColor: dark ? '#6755C9' : '#3826A6',
							opacity: loading ? 0.4 : 1
						}}
						onPress={() => onVerifyEmail()}
					>
						<Text style={{ ...styles.btnTxt, color: '#fff' }}>{translate('common.confirm')}</Text>
					</Button>
				</View>
			</View>
		</ModalPopUp>
	);
};

export default ConfirmEmailPopup;

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: '#000000AA',
	justifyContent: 'center'
};

const styles = StyleSheet.create({
	btnStyle: {
		borderRadius: 7,
		paddingVertical: 10,
		width: '45%'
	},
	btnTxt: {
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	container: {
		alignSelf: 'center',
		backgroundColor: '#fff',
		borderRadius: 20,
		height: 306,
		padding: 24,
		width: '90%'
	},
	errorText: {
		color: colors.error,
		fontSize: 12
	},
	text: {
		color: '#B1AEBC',
		fontSize: 14,
		marginBottom: 24
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		marginBottom: 32,
		textAlign: 'center',
		width: '100%'
	},
	wrapButtons: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	wrapResendText: {
		flexDirection: 'row',
		width: '100%'
	}
});
