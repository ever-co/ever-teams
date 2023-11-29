/* eslint-disable camelcase */
/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from 'react';
import {
	View,
	ViewStyle,
	Modal,
	StyleSheet,
	TextInput,
	Animated,
	Dimensions,
	TouchableOpacity,
	FlatList,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import { Text } from 'react-native-paper';
// COMPONENTS
// STYLES
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { colors, typography, useAppTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { OT_Member } from '../../../../services/interfaces/IOrganizationTeam';
import { useStores } from '../../../../models';
import { BlurView } from 'expo-blur';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
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
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%'
				}}
			/>
			<KeyboardAvoidingView
				keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
				style={$modalBackGround}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const TransferOwnership: FC<Props> = function TransferOwnership({ visible, onDismiss }) {
	const { colors } = useAppTheme();
	const {
		authenticationStore: { user },
		teamStore: { activeTeam }
	} = useStores();
	const { $otherMembers, onUpdateOrganizationTeam, activeTeamManagers } = useOrganizationTeam();
	const [memberName, setMemberName] = useState('');
	const [selectedMember, setSelectedMember] = useState<OT_Member>(null);
	const [filteredMembers, setFilteredMembers] = useState<OT_Member[]>([]);

	const handleSubmit = async () => {
		if (selectedMember && activeTeam) {
			onUpdateOrganizationTeam({
				id: activeTeam.id,
				data: {
					...activeTeam,
					managerIds: [
						...activeTeamManagers
							.filter((m) => m.employee.userId !== user.id)
							.map((manager) => manager.employeeId),
						selectedMember.id
					],
					memberIds: activeTeam.members.map((member) => member.employeeId)
				}
			})
				.then(onDismiss)
				.catch(onDismiss);
		}
	};

	const filterMembers = () => {
		if (memberName.length > 0) {
			const newMembers = $otherMembers.filter((m) =>
				m.employee.fullName.toLowerCase().startsWith(memberName.toLocaleLowerCase())
			);
			setFilteredMembers(newMembers);
		} else {
			setFilteredMembers([]);
			setSelectedMember(null);
		}
	};

	useEffect(() => {
		filterMembers();
		if (selectedMember && selectedMember.employee.fullName !== memberName) {
			setSelectedMember(null);
		}
	}, [memberName]);

	const renderEmailCompletions = (filtmembers: OT_Member[]) => (
		<View
			style={{
				position: 'absolute',
				bottom: 62,
				width: '85%',
				maxHeight: 200,
				paddingVertical: 5,
				borderRadius: 10,
				backgroundColor: colors.background,
				...GS.shadow,
				zIndex: 1000
			}}
		>
			<FlatList
				data={filtmembers}
				keyExtractor={(item, index) => index.toString()}
				renderItem={({ item }) => (
					<TouchableOpacity
						onPress={() => {
							setMemberName(item.employee.fullName);
							setSelectedMember(item);
						}}
					>
						<View
							style={{
								width: '100%',
								paddingVertical: 5,
								paddingHorizontal: 16
							}}
						>
							<Text
								style={{
									color: colors.primary,
									fontFamily: typography.primary.bold,
									fontSize: 14
								}}
							>
								{memberName}
								<Text style={{ color: '#B1AEBC' }}>
									{item.employee.fullName.toLowerCase().replace(memberName.toLowerCase(), '')}
								</Text>
							</Text>
						</View>
					</TouchableOpacity>
				)}
				extraData={filteredMembers}
			/>
		</View>
	);

	const canSubmit = selectedMember && activeTeamManagers.length >= 2;
	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
				<View style={{ width: '100%', marginBottom: 20 }}>
					<Text style={[styles.mainTitle, { color: colors.primary }]}>
						{translate('settingScreen.teamSection.transferOwnership')}
					</Text>
					<Text style={styles.hint}>{translate('settingScreen.teamSection.transferOwnershipHint')}</Text>
				</View>
				<View style={{ width: '100%' }}>
					<View>
						{filteredMembers.length > 0 && !selectedMember ? renderEmailCompletions(filteredMembers) : null}
						<TextInput
							placeholderTextColor={colors.tertiary}
							autoCapitalize={'none'}
							autoCorrect={false}
							value={memberName}
							style={[styles.textInput, { borderColor: colors.border, color: colors.primary }]}
							placeholder={translate('teamScreen.inviteNameFieldPlaceholder')}
							onChangeText={(text) => setMemberName(text)}
						/>
						<Text style={[styles.hint, { color: 'red' }]}>{''}</Text>
					</View>
					<View style={styles.wrapButtons}>
						<TouchableOpacity
							onPress={() => onDismiss()}
							style={[styles.button, { backgroundColor: '#E6E6E9' }]}
						>
							<Text style={[styles.buttonText, { color: '#1A1C1E' }]}>{translate('common.cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, { backgroundColor: '#3826A6', opacity: !canSubmit ? 0.3 : 1 }]}
							onPress={() => (canSubmit ? handleSubmit() : {})}
						>
							<Text style={styles.buttonText}>{translate('teamScreen.sendButton')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</ModalPopUp>
	);
};

export default TransferOwnership;

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: 'flex-end'
};

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		borderRadius: 11,
		height: 57,
		justifyContent: 'center',
		padding: 10,
		width: width / 2.5
	},
	buttonText: {
		color: '#FFF',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	crossIcon: {
		position: 'absolute',
		right: 10,
		top: 10
	},
	hint: {
		color: '#7E7991',
		fontFamily: typography.primary.semiBold,
		fontSize: 12
	},

	loading: {
		bottom: '12%',
		left: '15%',
		position: 'absolute'
	},
	mainContainer: {
		alignItems: 'center',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		height: 260,
		paddingHorizontal: 20,
		paddingVertical: 30,
		width: '100%'
	},
	mainTitle: {
		color: colors.primary,
		fontFamily: typography.primary.semiBold,
		fontSize: 24
	},
	textInput: {
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 10,
		borderWidth: 1,
		color: colors.primary,
		height: 45,
		paddingHorizontal: 13,
		width: '100%'
	},
	theTextField: {
		borderWidth: 0,
		width: '100%'
	},
	wrapButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20
	}
});
