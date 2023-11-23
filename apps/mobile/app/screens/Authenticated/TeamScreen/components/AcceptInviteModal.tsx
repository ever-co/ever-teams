/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useEffect, useState } from 'react';
import {
	View,
	ViewStyle,
	Modal,
	StyleSheet,
	Animated,
	Dimensions,
	TouchableOpacity,
	ActivityIndicator
} from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { typography, useAppTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { imgTitle } from '../../../../helpers/img-title';
import { IMyInvitation } from '../../../../services/interfaces/IInvite';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	invitation: IMyInvitation;
	onAcceptInvitation: (id: string) => Promise<any>;
	onRejectInvitation: (id: string) => Promise<any>;
}
const { width } = Dimensions.get('window');

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
		<Modal transparent visible={showModal}>
			<View style={$modalBackGround}>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</View>
		</Modal>
	);
};

const AcceptInviteModal: FC<Props> = function InviteUserModal({
	visible,
	onDismiss,
	invitation,
	onAcceptInvitation,
	onRejectInvitation
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [actionType, setActionType] = useState<'REJECT' | 'ACCEPT'>();
	const { colors } = useAppTheme();

	const acceptInvitation = async () => {
		setIsLoading(true);
		setActionType('ACCEPT');
		await onAcceptInvitation(invitation.id)
			.then(() => {
				setIsLoading(false);
				setActionType(null);
				onDismiss();
			})
			.catch(() => {
				setIsLoading(false);
				setActionType(null);
				onDismiss();
			});
	};

	const rejectInvitation = async () => {
		setIsLoading(true);
		setActionType('REJECT');
		await onRejectInvitation(invitation.id)
			.then(() => {
				setIsLoading(false);
				setActionType(null);
				onDismiss();
			})
			.catch(() => {
				setIsLoading(false);
				setActionType(null);
				onDismiss();
			});
	};

	useEffect(() => {
		setActionType(null);
	}, []);

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ width: '100%' }}>
					<View style={styles.contentContainer}>
						{invitation?.teams[0]?.image ? (
							<Avatar.Image size={70} source={{ uri: invitation.teams[0].image?.thumbUrl }} />
						) : (
							<Avatar.Text size={70} label={imgTitle(invitation?.teams[0].name || '')} />
						)}
						<Text style={[styles.inviteMessage, { marginTop: 16 }]}>
							{translate('inviteModal.inviteHint')}
						</Text>
						<Text style={styles.inviteMessage}>{`${invitation?.teams[0].name} ?`}</Text>
					</View>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => rejectInvitation()}
							style={[
								styles.button,
								{
									backgroundColor: '#E6E6E9',
									opacity: isLoading && actionType === 'REJECT' ? 0.4 : 1
								}
							]}
						>
							{actionType === 'REJECT' ? <ActivityIndicator size={'small'} color={'#1A1C1E'} /> : null}
							<Text style={[styles.buttonText, { color: '#1A1C1E' }]}>
								{translate('inviteModal.reject')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.button,
								{
									backgroundColor: '#3826A6',
									opacity: isLoading && actionType === 'ACCEPT' ? 0.4 : 1
								}
							]}
							onPress={() => acceptInvitation()}
						>
							{actionType === 'ACCEPT' ? <ActivityIndicator size={'small'} color={'#fff'} /> : null}
							<Text style={styles.buttonText}>{translate('inviteModal.accept')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</ModalPopUp>
	);
};

export default AcceptInviteModal;

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: 'rgba(0,0,0,0.5)',
	justifyContent: 'flex-end'
};

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		borderRadius: 11,
		flexDirection: 'row',
		height: 57,
		justifyContent: 'center',
		padding: 10,
		width: width / 2.5
	},
	buttonText: {
		color: '#FFF',
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
		marginLeft: 10
	},
	contentContainer: {
		alignItems: 'center',
		flexDirection: 'column',
		justifyContent: 'center',
		width: '100%'
	},
	inviteMessage: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 18
	},
	mainContainer: {
		alignItems: 'center',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: 20,
		paddingVertical: 30,
		width: '100%'
	},
	wrapButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 30
	}
});
