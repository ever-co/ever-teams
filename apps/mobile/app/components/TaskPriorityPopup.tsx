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
import { spacing, useAppTheme } from '../theme';
import { BadgedTaskPriority } from './PriorityIcon';
import { useTaskPriority } from '../services/hooks/features/useTaskPriority';
import { ITaskPriorityItem } from '../services/interfaces/ITaskPriority';
import { translate } from '../i18n';
import { BlurView } from 'expo-blur';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	priorityName: string;
	setSelectedPriority: (status: ITaskPriorityItem) => unknown;
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

const TaskPriorityPopup: FC<Props> = function TaskPriorityPopup({
	visible,
	onDismiss,
	setSelectedPriority,
	priorityName
}) {
	const { allTaskPriorities } = useTaskPriority();
	const { colors } = useAppTheme();
	const onPrioritySelected = (size: ITaskPriorityItem) => {
		setSelectedPriority(size);
		onDismiss();
	};

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View style={{ ...styles.container, backgroundColor: colors.background }}>
				<Text style={{ ...styles.title, color: colors.primary }}>
					{translate('settingScreen.priorityScreen.priorities')}
				</Text>
				<FlatList
					data={allTaskPriorities}
					contentContainerStyle={{ paddingHorizontal: 10 }}
					renderItem={({ item }) => (
						<Item currentSizeName={priorityName} onPrioritySelected={onPrioritySelected} priority={item} />
					)}
					legacyImplementation={true}
					showsVerticalScrollIndicator={true}
					keyExtractor={(_, index) => index.toString()}
				/>
			</View>
		</ModalPopUp>
	);
};

export default TaskPriorityPopup;

interface ItemProps {
	currentSizeName: string;
	priority: ITaskPriorityItem;
	onPrioritySelected: (size: ITaskPriorityItem) => unknown;
}
const Item: FC<ItemProps> = ({ currentSizeName, priority, onPrioritySelected }) => {
	const { colors } = useAppTheme();
	const selected = priority.value === currentSizeName;
	return (
		<TouchableOpacity onPress={() => onPrioritySelected(priority)}>
			<View style={{ ...styles.wrapperItem, borderColor: colors.border }}>
				<View style={{ ...styles.colorFrame, backgroundColor: priority.color }}>
					<BadgedTaskPriority iconSize={16} TextSize={14} priority={priority.name} />
				</View>
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
		borderRadius: 10,
		height: 44,
		justifyContent: 'center',
		paddingLeft: 16,
		width: 180
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
