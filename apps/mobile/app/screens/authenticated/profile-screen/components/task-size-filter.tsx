/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect } from 'react';
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	Dimensions,
	Animated,
	Modal,
	TouchableWithoutFeedback,
	FlatList
} from 'react-native';
import { AntDesign, Feather, FontAwesome } from '@expo/vector-icons';
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { observer } from 'mobx-react-lite';
import { typography, useAppTheme } from '../../../../theme';
import { useTaskSizeValue } from '../../../../components/status-type';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { ITaskFilter } from '../../../../services/hooks/features/use-task-filters';
import { useTaskSizes } from '../../../../services/hooks/features/use-task-sizes';
import { ITaskSizeItem } from '../../../../services/interfaces/ITaskSize';
import { StatusType } from './filter-popup';
import { BlurView } from 'expo-blur';
import { translate } from '../../../../i18n';

interface TaskSizeFilterProps {
	showSizePopup: boolean;
	setShowSizePopup: (value: boolean) => unknown;
	taskFilter: ITaskFilter;
	setSelectedSizes: (newValue: string[], statusType: StatusType) => void;
	selectedSizes: string[];
}

const { height, width } = Dimensions.get('window');

const TaskStatusFilter: FC<TaskSizeFilterProps> = observer(
	({ setShowSizePopup, showSizePopup, taskFilter, selectedSizes, setSelectedSizes }) => {
		const { colors } = useAppTheme();

		useEffect(() => {
			taskFilter.onChangeStatusFilter('size', selectedSizes);
			taskFilter.applyStatusFilter();
		}, [selectedSizes]);
		return (
			<>
				<TouchableOpacity onPress={() => setShowSizePopup(!showSizePopup)}>
					<View style={{ ...styles.container, borderColor: colors.divider }}>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text style={{ marginRight: 10, color: colors.primary }}>
								{translate('settingScreen.sizeScreen.sizes')}
							</Text>
							{selectedSizes.length === 0 ? null : (
								<FontAwesome name="circle" size={24} color={colors.secondary} />
							)}
						</View>
						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
				<TaskStatusFilterDropDown
					visible={showSizePopup}
					onDismiss={() => setShowSizePopup(false)}
					selectedSizes={selectedSizes}
					setSelectedSizes={setSelectedSizes}
				/>
			</>
		);
	}
);

interface DropDownProps {
	visible: boolean;
	onDismiss: () => unknown;
	setSelectedSizes: (newValue: string[], statusType: StatusType) => void;
	selectedSizes: string[];
}

const TaskStatusFilterDropDown: FC<DropDownProps> = observer(
	({ visible, onDismiss, setSelectedSizes, selectedSizes }) => {
		const { colors, dark } = useAppTheme();
		const { allTaskSizes } = useTaskSizes();

		return (
			<ModalPopUp visible={visible} onDismiss={onDismiss}>
				<TouchableWithoutFeedback>
					<View
						style={[
							styles.dropdownContainer,
							{
								backgroundColor: colors.background,
								shadowColor: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
							}
						]}
					>
						<View style={styles.secondContainer}>
							<Text style={[styles.dropdownTitle, { color: colors.primary }]}>
								{translate('settingScreen.sizeScreen.sizes')}
							</Text>
							<View style={{ paddingHorizontal: 16, height: height / 2.55 }}>
								<FlatList
									bounces={false}
									showsVerticalScrollIndicator={false}
									data={allTaskSizes}
									renderItem={({ item, index }) => (
										<DropDownItem
											selectedSizes={selectedSizes}
											setSelectedSizes={setSelectedSizes}
											size={item}
											key={index}
										/>
									)}
								/>
							</View>
						</View>
					</View>
				</TouchableWithoutFeedback>
			</ModalPopUp>
		);
	}
);

const DropDownItem = observer(
	({
		size,
		selectedSizes,
		setSelectedSizes
	}: {
		size: ITaskSizeItem;
		setSelectedSizes: (newValue: string[], statusType: StatusType) => void;
		selectedSizes: string[];
	}) => {
		const allTaskSizes = useTaskSizeValue();
		const sizeItem = allTaskSizes[size.name.split('-').join(' ')];
		const { dark } = useAppTheme();

		const exist = selectedSizes.find((s) => s === sizeItem?.value);

		const onSelectedSize = () => {
			if (exist) {
				const newStatuses = selectedSizes.filter((s) => s !== sizeItem.value);
				setSelectedSizes([...newStatuses], 'sizes');
			} else {
				setSelectedSizes([...selectedSizes, sizeItem.value], 'sizes');
			}
		};

		return (
			<TouchableOpacity
				style={{ ...styles.itemContainer, backgroundColor: dark && '#2E3138' }}
				onPress={() => onSelectedSize()}
			>
				<View style={{ ...styles.dropdownItem, backgroundColor: sizeItem?.bgColor }}>
					{sizeItem?.icon}
					<Text style={styles.itemText}>{limitTextCharaters({ text: sizeItem?.name, numChars: 17 })}</Text>
				</View>
				{exist ? (
					<AntDesign name="checkcircle" size={24} color="#27AE60" />
				) : (
					<Feather name="circle" size={24} color="rgba(40, 32, 72, 0.43)" />
				)}
			</TouchableOpacity>
		);
	}
);

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
					<Animated.View
						style={{
							transform: [{ scale: scaleValue }],
							flex: 1,
							justifyContent: 'center',
							alignItems: 'center'
						}}
					>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: 'flex-end'
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderColor: 'rgba(0,0,0,0.16)',
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		height: 57,
		justifyContent: 'space-between',
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 16,
		paddingVertical: 10,
		width: width / 2.4,
		zIndex: 1000
	},
	dropdownContainer: {
		borderRadius: 20,
		minHeight: height / 2.3,
		width: '95%',
		zIndex: 1001,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 10,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 1,
		shadowRadius: 10
	},
	dropdownItem: {
		alignItems: 'center',
		borderRadius: 10,
		flexDirection: 'row',
		height: 44,
		overflow: 'hidden',
		paddingHorizontal: 16,
		width: '60%'
	},
	dropdownTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginBottom: 5,
		marginLeft: 16
	},
	itemContainer: {
		alignItems: 'center',
		borderColor: 'rgba(0,0,0,0.2)',
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		height: 56,
		justifyContent: 'space-between',
		marginVertical: 5,
		paddingLeft: 6,
		paddingRight: 18,
		width: '100%'
	},
	itemText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		marginLeft: 10,
		textTransform: 'capitalize'
	},
	secondContainer: {
		marginVertical: 16
	}
});

export default TaskStatusFilter;
