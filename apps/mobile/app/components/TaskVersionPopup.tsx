/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from 'react';
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
import { Feather, AntDesign, Ionicons } from '@expo/vector-icons';
import { spacing, useAppTheme, typography } from '../theme';
import { ITaskPriorityItem } from '../services/interfaces/ITaskPriority';
// import { translate } from "../i18n"
import { BlurView } from 'expo-blur';
import { useTaskVersion } from '../services/hooks/features/useTaskVersion';
import { BadgedTaskVersion } from './VersionIcon';
import { ITaskVersionItemList } from '../services/interfaces/ITaskVersion';
import { translate } from '../i18n';
import TaskVersionForm from '../screens/Authenticated/TaskVersionScreen/components/TaskVersionForm';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	versionName: string;
	setSelectedVersion: (status: ITaskVersionItemList) => unknown;
	canCreateVersion?: boolean;
}

const TaskVersionPopup: FC<Props> = function TaskPriorityPopup({
	visible,
	onDismiss,
	setSelectedVersion,
	versionName,
	canCreateVersion
}) {
	const { taskVersionList } = useTaskVersion();
	const { colors, dark } = useAppTheme();
	const { createTaskVersion, updateTaskVersion } = useTaskVersion();

	const [createVersionMode, setCreateVersionMode] = useState<boolean>(false);

	const onVersionSelected = (size: ITaskPriorityItem) => {
		setSelectedVersion(size);
		onDismiss();
		setCreateVersionMode(false);
	};

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View
				style={{
					...styles.container,
					backgroundColor: colors.background,
					height: canCreateVersion && !createVersionMode ? 460 : createVersionMode ? 260 : 396,
					overflow: canCreateVersion ? 'hidden' : 'scroll'
				}}
			>
				{!createVersionMode ? (
					<>
						<Text style={{ ...styles.title, color: colors.primary }}>Versions</Text>
						<FlatList
							data={taskVersionList}
							contentContainerStyle={{ paddingHorizontal: 10 }}
							renderItem={({ item }) => (
								<Item
									currentVersionName={versionName}
									onVersionSelected={onVersionSelected}
									version={item}
								/>
							)}
							legacyImplementation={true}
							showsVerticalScrollIndicator={true}
							keyExtractor={(_, index) => index.toString()}
						/>
						{canCreateVersion && (
							<TouchableOpacity
								style={{
									...styles.createButton,
									borderColor: dark ? '#6755C9' : '#3826A6'
								}}
								onPress={() => setCreateVersionMode(true)}
							>
								<Ionicons name="add" size={24} color={dark ? '#6755C9' : '#3826A6'} />
								<Text
									style={{
										...styles.btnText,
										color: dark ? '#6755C9' : '#3826A6'
									}}
								>
									{translate('settingScreen.versionScreen.createNewVersionText')}
								</Text>
							</TouchableOpacity>
						)}
					</>
				) : (
					<TaskVersionForm
						onDismiss={() => setCreateVersionMode(false)}
						onCreateVersion={createTaskVersion}
						onUpdateVersion={updateTaskVersion}
						isEdit={false}
						createVersionModal={true}
					/>
				)}
			</View>
		</ModalPopUp>
	);
};

export default TaskVersionPopup;

interface ItemProps {
	currentVersionName: string;
	version: ITaskPriorityItem;
	onVersionSelected: (size: ITaskPriorityItem) => unknown;
}
const Item: FC<ItemProps> = ({ currentVersionName, version, onVersionSelected }) => {
	const { colors } = useAppTheme();
	const selected = version.value === currentVersionName;

	return (
		<TouchableOpacity onPress={() => onVersionSelected(version)}>
			<View style={{ ...styles.wrapperItem, borderColor: colors.border }}>
				<View style={{ ...styles.colorFrame, backgroundColor: 'transparent' }}>
					<BadgedTaskVersion iconSize={16} TextSize={14} version={version.name} />
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

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: 'center'
};

const styles = StyleSheet.create({
	btnText: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		fontStyle: 'normal'
	},
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
		maxHeight: 396,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: '90%'
	},
	createButton: {
		alignItems: 'center',
		alignSelf: 'center',
		borderColor: '#3826A6',
		borderRadius: 12,
		borderWidth: 2,
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 10,
		padding: 12,
		width: '80%'
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
