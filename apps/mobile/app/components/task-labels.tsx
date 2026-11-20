/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, FlatList, Dimensions } from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ITeamTask } from '../services/interfaces/ITask';
import { useTeamTasks } from '../services/hooks/features/use-team-tasks';
import { useAppTheme, typography, useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';
import { ChipIcon } from '../../src/components/chip-icon';
import TaskLabelPopup from './task-label-popup';
import { useLabelSelection } from './use-label-selection';
import { useMenuAnchor } from '../../src/components/menu-anchor';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';
import { translate } from '../i18n';
import { limitTextCharaters } from '../helpers/sub-text';

interface TaskLabelProps {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	labels?: string;
	setLabels?: (label: ITaskLabelItem[]) => unknown;
	newTaskLabels?: ITaskLabelItem[] | undefined;
	taskScreenButton?: boolean;
	noBorders?: boolean;
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

const TaskLabels: FC<TaskLabelProps> = observer(
	({ task, setLabels, newTaskLabels, taskScreenButton, noBorders, containerStyle }) => {
		const { colors, dark } = useAppTheme();
		const theme = useWebTheme();
		const placeholder = taskChipLookOf(undefined, theme);
		const { updateTask } = useTeamTasks();
		const [openModal, setOpenModal] = useState(false);
		const flatListRef = useRef<FlatList>(null);
		const [labelIndex, setLabelIndex] = useState<number>(0);
		const { anchorRef, anchor, openFromAnchor } = useMenuAnchor();

		const saveLabels = async (labels: ITaskLabelItem[]) => {
			if (!task) {
				setLabels?.(labels);
				return true;
			}
			try {
				const { response } = await updateTask({ ...task, tags: labels }, task.id);
				return response.ok;
			} catch {
				return false;
			}
		};
		const { selectedLabels, toggle, startFrom } = useLabelSelection(task?.tags || newTaskLabels || [], saveLabels);

		// The menu starts from the labels the task holds; each tap then saves, one write at a time, as on the web
		const freshOpenModal = (tapped?: View | null) => {
			openFromAnchor(() => {
				startFrom(task?.tags || newTaskLabels || []);
				setOpenModal(true);
			}, tapped);
		};

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
					selectedLabels={selectedLabels}
					visible={openModal}
					onToggleLabel={toggle}
					onDismiss={() => setOpenModal(false)}
					canCreateLabel={true}
					anchor={anchor}
				/>
				{(task?.tags !== undefined || newTaskLabels !== undefined) &&
				(task?.tags?.length > 0 || newTaskLabels?.length > 0) &&
				!taskScreenButton ? (
					<View ref={anchorRef} collapsable={false}>
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
									{
										backgroundColor: dark ? '#1e2430' : colors.background,
										right: 0
									}
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
									{
										left: 0,
										backgroundColor: dark ? '#1e2430' : colors.background
									}
								]}
								onPress={() => onPrevPressed()}
							>
								<AntDesign name="left" size={18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
					</View>
				) : (task?.tags !== undefined || newTaskLabels !== undefined) &&
				  (task?.tags?.length > 0 || newTaskLabels?.length > 0) &&
				  taskScreenButton ? (
					<View>
						<TouchableOpacity onPress={() => freshOpenModal()}>
							<View
								ref={anchorRef}
								collapsable={false}
								style={{
									...styles.container,
									...containerStyle,
									...placeholder.container,
									marginTop: 0,
									marginBottom: 15
								}}
							>
								<View style={styles.wrapStatus}>
									<Entypo name="circle" size={12} color={placeholder.ink} />
									<Text
										style={{
											...styles.text,
											color: placeholder.ink,
											marginLeft: 5
										}}
									>
										{translate('taskDetailsScreen.items')} ({task?.tags?.length ?? 0})
									</Text>
								</View>

								<AntDesign name="down" size={14} color={placeholder.ink} />
							</View>
						</TouchableOpacity>
						<FlatList
							ref={flatListRef}
							data={task?.tags || newTaskLabels}
							renderItem={({ item }) => (
								<Label
									item={item}
									noBorders={noBorders}
									freshOpenModal={freshOpenModal}
									taskScreenButton={taskScreenButton}
								/>
							)}
							// horizontal={true}
							scrollEnabled={false}
							keyExtractor={(_, index) => index.toString()}
							showsHorizontalScrollIndicator={false}
							// ItemSeparatorComponent={() => (
							// 	<View style={{ width: 10, backgroundColor: "transparent" }}></View>
							// )}
							onMomentumScrollEnd={handleScrollEnd}
						/>
					</View>
				) : (
					<TouchableOpacity onPress={() => freshOpenModal()}>
						<View
							ref={anchorRef}
							collapsable={false}
							style={{
								...styles.container,
								...containerStyle,
								...placeholder.container
							}}
						>
							<View style={styles.wrapStatus}>
								<Entypo name="circle" size={12} color={placeholder.ink} />
								<Text style={{ ...styles.text, color: placeholder.ink, marginLeft: 5 }}></Text>
								<Text style={{ ...styles.text, color: placeholder.ink }}>
									{translate('settingScreen.labelScreen.labels')}
								</Text>
							</View>

							<AntDesign name="down" size={14} color={placeholder.ink} />
						</View>
					</TouchableOpacity>
				)}
			</>
		);
	}
);

interface ILabel {
	item: IndividualTaskLabel | null;
	/** Opens the menu under the label tapped. */
	freshOpenModal: (tapped?: View | null) => void;
	taskScreenButton?: boolean;
	noBorders?: boolean;
}

const Label: FC<ILabel> = ({ item, freshOpenModal, taskScreenButton, noBorders }) => {
	const theme = useWebTheme();
	const look = taskChipLookOf(item?.color, theme);
	const chipRef = useRef<View>(null);

	const { width } = Dimensions.get('screen');

	return (
		<TouchableOpacity style={{}} onPress={() => freshOpenModal(chipRef.current)}>
			<View
				ref={chipRef}
				collapsable={false}
				style={[
					{
						flexDirection: 'row',
						alignItems: 'center',
						marginVertical: taskScreenButton ? 3 : 20,
						height: 32,
						minWidth: taskScreenButton ? undefined : 100,
						maxWidth: taskScreenButton ? '70%' : 120,
						borderRadius: 8,
						paddingHorizontal: 8
					},
					look.container,
					noBorders && { borderWidth: 0 }
				]}
			>
				<ChipIcon item={{ name: item?.name, bgColor: item?.color }} color={look.ink} kind="label" />
				<Text
					style={{
						color: look.ink,
						fontSize: 10,
						fontFamily: typography.fonts.PlusJakartaSans.semiBold,
						marginLeft: 10
					}}
				>
					{limitTextCharaters({
						text: item?.name,
						numChars: taskScreenButton && width > 420 ? 15 : 12
					})}
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
