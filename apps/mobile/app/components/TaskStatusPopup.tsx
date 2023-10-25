/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC } from 'react';
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	Text,
	FlatList,
	TouchableOpacity,
	TouchableWithoutFeedback
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useTaskStatus } from '../services/hooks/features/useTaskStatus';
import { ITaskStatusItem } from '../services/interfaces/ITaskStatus';
import { spacing, typography, useAppTheme } from '../theme';
import { translate } from '../i18n';
import { useTaskStatusValue } from './StatusType';
import { BlurView } from 'expo-blur';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	statusName: string;
	setSelectedStatus?: (status: string) => unknown;
}

const ModalPopUp = ({ visible, children, onDismiss }) => {
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
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%'
				}}
			/>
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const TaskStatusPopup: FC<Props> = function FilterPopup({ visible, onDismiss, setSelectedStatus, statusName }) {
	const { allStatuses } = useTaskStatus();
	const { colors } = useAppTheme();
	const onStatusSelected = (status: string) => {
		setSelectedStatus(status);
		onDismiss();
	};

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View style={{ ...styles.container, backgroundColor: colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>
					{translate('settingScreen.statusScreen.statuses')}
				</Text>
				<FlatList
					data={allStatuses}
					contentContainerStyle={{ paddingHorizontal: 10 }}
					renderItem={({ item }) => (
						<Item currentStatusName={statusName} onStatusSelected={onStatusSelected} status={item} />
					)}
					legacyImplementation={true}
					showsVerticalScrollIndicator={true}
					keyExtractor={(_, index) => index.toString()}
				/>
			</View>
		</ModalPopUp>
	);
};

export default TaskStatusPopup;
interface ItemProps {
	currentStatusName: string;
	status: ITaskStatusItem;
	onStatusSelected: (status: string) => unknown;
}
const Item: FC<ItemProps> = ({ currentStatusName, status, onStatusSelected }) => {
	const { colors } = useAppTheme();
	const selected = status.value === currentStatusName;

	const allStatuses = useTaskStatusValue();
	const cStatus = allStatuses && allStatuses[status.name.split('-').join(' ')];

	return (
		<TouchableOpacity onPress={() => onStatusSelected(cStatus.value)}>
			<View style={{ ...styles.wrapperItem, borderColor: colors.border }}>
				{cStatus && (
					<View style={{ ...styles.colorFrame, backgroundColor: status.color }}>
						{cStatus.icon}
						<Text style={styles.text}>{cStatus.name}</Text>
					</View>
				)}
				<View>
					{!selected ? (
						<Feather name="circle" size={24} color={colors.divider} />
					) : (
						<AntDesign name="checkcircle" size={24} color="#27AE60" />
					)}
				</View>
			</View>
		</TouchableOpacity>
	);
};

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: 'center'
};

const styles = StyleSheet.create({
	colorFrame: {
		alignItems: 'center',
		backgroundColor: '#D4EFDF',
		borderRadius: 10,
		flexDirection: 'row',
		height: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		width: '60%'
	},
	container: {
		alignSelf: 'center',
		backgroundColor: '#fff',
		borderRadius: 20,
		height: 396,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: '90%'
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginLeft: 13.5,
		textTransform: 'capitalize'
	},
	title: {
		fontSize: spacing.medium - 2,
		marginBottom: 16,
		marginHorizontal: 10
	},
	wrapperItem: {
		alignItems: 'center',
		borderColor: 'rgba(0,0,0,0.13)',
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
		padding: 6,
		paddingRight: 18,
		width: '100%'
	}
});
