/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, FlatList } from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ITeamTask } from '../services/interfaces/ITask';
import { useTeamTasks } from '../services/hooks/features/useTeamTasks';
import { useAppTheme, typography } from '../theme';
import TaskLabelPopup from './TaskLabelPopup';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';
import { translate } from '../i18n';
import { limitTextCharaters } from '../helpers/sub-text';
import { SvgUri } from 'react-native-svg';
import { isEqual } from 'lodash';

interface TaskLabelProps {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	labels?: string;
	setLabels?: (label: ITaskLabelItem[]) => unknown;
	newTaskLabels?: ITaskLabelItem[] | undefined;
}

interface IndividualTaskLabel {
	color: string;
	createdAt: string;
	description: string | null;
	fullIconUrl: string;
	icon: string;
	id: string;
	isSystem: boolean;
	name: string;
	organizationId: string;
	organizationTeamId: string;
	tenantId: string;
	updatedAt: string;
}

const TaskLabels: FC<TaskLabelProps> = observer(({ task, setLabels, newTaskLabels }) => {
	const { colors, dark } = useAppTheme();
	const { updateTask } = useTeamTasks();
	const [openModal, setOpenModal] = useState(false);
	const flatListRef = useRef<FlatList>(null);
	const [labelIndex, setLabelIndex] = useState<number>(0);
	const [tempLabels, setTempLabels] = useState<ITaskLabelItem[]>(task?.tags || newTaskLabels || []);
	const [arrayChanged, setArrayChanged] = useState<boolean>(false);

	const freshOpenModal = () => {
		setOpenModal(true);
		setTempLabels(task?.tags || newTaskLabels || []);
		arraysHaveSameValues(tempLabels, task?.tags || newTaskLabels || []);
	};

	const saveLabels = async () => {
		if (task) {
			const taskEdit = {
				...task,
				tags: tempLabels
			};
			await updateTask(taskEdit, task.id);
		} else {
			setLabels(tempLabels);
		}
		setOpenModal(false);
	};

	const addOrRemoveLabelsInTempArray = (tag: ITaskLabelItem): void => {
		const exist = tempLabels.find((label) => label.id === tag.id);
		if (exist) {
			setTempLabels(tempLabels.filter((label) => label.id !== tag.id));
		} else {
			setTempLabels([...tempLabels, tag]);
		}
	};

	const arraysHaveSameValues = (array1: ITaskLabelItem[] | [], array2: ITaskLabelItem[] | []): void => {
		const sortedArray1 = array1.slice().sort((a, b) => a.id.localeCompare(b.id));
		const sortedArray2 = array2.slice().sort((a, b) => a.id.localeCompare(b.id));

		const areArraysEqual = isEqual(sortedArray1, sortedArray2);

		setArrayChanged(!areArraysEqual);
	};

	useEffect(() => {
		arraysHaveSameValues(tempLabels, task?.tags || newTaskLabels || []);
	}, [tempLabels]);

	const scrollToIndexWithDelay = (index: number) => {
		flatListRef.current?.scrollToIndex({
			animated: true,
			index: index < 0 ? 0 : index,
			viewPosition: 0
		});
	};

	const onNextPressed = () => {
		if (labelIndex !== task?.tags?.length - 2) {
			scrollToIndexWithDelay(labelIndex + 1);
		}
	};

	const onPrevPressed = () => {
		if (labelIndex > 0) {
			const newIndex = labelIndex - 2;
			scrollToIndexWithDelay(newIndex);
		}
	};

	const handleScrollEnd = (event: any) => {
		const offsetX = event.nativeEvent.contentOffset.x;
		const currentIndex = Math.round(offsetX / 100); // Assuming 100 is the item width
		setLabelIndex(currentIndex);
	};

	return (
		<>
			<TaskLabelPopup
				labelNames={tempLabels}
				visible={openModal}
				saveLabels={saveLabels}
				arrayChanged={arrayChanged}
				addOrRemoveLabels={addOrRemoveLabelsInTempArray}
				onDismiss={() => setOpenModal(false)}
				canCreateLabel={true}
			/>
			{(task?.tags !== undefined || newTaskLabels !== undefined) &&
			(task?.tags?.length > 0 || newTaskLabels?.length > 0) ? (
				<View>
					<FlatList
						ref={flatListRef}
						data={task?.tags || newTaskLabels}
						renderItem={({ item }) => <Label item={item} freshOpenModal={freshOpenModal} />}
						horizontal={true}
						keyExtractor={(_, index) => index.toString()}
						showsHorizontalScrollIndicator={false}
						ItemSeparatorComponent={() => (
							<View style={{ width: 10, backgroundColor: 'transparent' }}></View>
						)}
						onMomentumScrollEnd={handleScrollEnd}
					/>
					{labelIndex >= (task?.tags?.length - 3 || newTaskLabels?.length - 3) ||
					task?.tags?.length < 3 ||
					newTaskLabels?.length < 3 ? null : (
						<TouchableOpacity
							activeOpacity={0.7}
							style={[
								styles.scrollButtons,
								{ backgroundColor: dark ? '#1e2430' : colors.background, right: 0 }
							]}
							onPress={() => onNextPressed()}
						>
							<AntDesign name="right" size={18} color={colors.primary} />
						</TouchableOpacity>
					)}
					{labelIndex >= 1 ? (
						<TouchableOpacity
							activeOpacity={0.7}
							style={[
								styles.scrollButtons,
								{ left: 0, backgroundColor: dark ? '#1e2430' : colors.background }
							]}
							onPress={() => onPrevPressed()}
						>
							<AntDesign name="left" size={18} color={colors.primary} />
						</TouchableOpacity>
					) : null}
				</View>
			) : (
				<TouchableOpacity onPress={freshOpenModal}>
					<View
						style={{
							...styles.container,
							borderColor: colors.border
						}}
					>
						<View style={styles.wrapStatus}>
							<Entypo name="circle" size={12} color={colors.primary} />
							<Text style={{ ...styles.text, color: colors.primary, marginLeft: 5 }}></Text>
							<Text style={{ ...styles.text, color: colors.primary }}>
								{translate('settingScreen.labelScreen.labels')}
							</Text>
						</View>

						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
			)}
		</>
	);
});

interface ILabel {
	item: IndividualTaskLabel | null;
	freshOpenModal: () => void;
}

const Label: FC<ILabel> = ({ item, freshOpenModal }) => {
	const { colors } = useAppTheme();
	return (
		<TouchableOpacity style={{}} onPress={freshOpenModal}>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					backgroundColor: item?.color,
					marginVertical: 20,
					height: 32,
					minWidth: 100,
					maxWidth: 120,
					borderRadius: 10,
					borderColor: colors.border,
					borderWidth: 1,
					paddingHorizontal: 8
				}}
			>
				<SvgUri width={14} height={14} uri={item?.fullIconUrl} />
				<Text
					style={{
						color: '#292D32',
						fontSize: 10,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						marginLeft: 10
					}}
				>
					{limitTextCharaters({ text: item?.name, numChars: 12 })}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		justifyContent: 'space-between',
		marginVertical: 20,
		paddingHorizontal: 12,
		paddingVertical: 7,
		width: 160
	},
	scrollButtons: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 20,
		bottom: 23,
		elevation: 10,
		height: 27,
		justifyContent: 'center',
		padding: 5,
		position: 'absolute',
		shadowColor: 'rgba(0,0,0,0.16)',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		shadowRadius: 15,
		width: 28
	},
	text: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10
	},
	wrapStatus: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '70%'
	}
});

export default TaskLabels;
