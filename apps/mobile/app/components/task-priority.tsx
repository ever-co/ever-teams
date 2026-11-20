/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ITeamTask } from '../services/interfaces/ITask';
import { useTeamTasks } from '../services/hooks/features/use-team-tasks';
import { typography, useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';
import { ChipIcon } from '../../src/components/chip-icon';
import { useMenuAnchor } from '../../src/components/menu-anchor';
import TaskPriorityPopup from './task-priority-popup';
import { translate } from '../i18n';
import { useTaskPriorityValue } from './status-type';
import { limitTextCharaters } from '../helpers/sub-text';

interface TaskPriorityProps {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	priority?: string;
	setPriority?: (priority: string) => unknown;
	canCreatePriority?: boolean;
}

const TaskPriority: FC<TaskPriorityProps> = observer(
	({ task, containerStyle, priority, setPriority, canCreatePriority }) => {
		const theme = useWebTheme();
		const { updateTask } = useTeamTasks();
		const [openModal, setOpenModal] = useState(false);
		const { anchorRef, anchor, openFromAnchor } = useMenuAnchor();

		const allTaskPriorities = useTaskPriorityValue();

		const sizeValue = (
			task?.priority?.split('-').join(' ') ||
			(priority && priority.split('-').join(' '))
		)?.toLowerCase();

		const currentPriority =
			allTaskPriorities && Object.values(allTaskPriorities).find((item) => item.name.toLowerCase() === sizeValue);
		const look = taskChipLookOf(currentPriority?.bgColor, theme);

		const onChangePriority = async (text: string) => {
			if (task) {
				const taskEdit = {
					...task,
					priority: task?.priority === text ? null : text
				};

				await updateTask(taskEdit, task.id);
			} else {
				setPriority(text);
			}
		};

		return (
			<>
				<TaskPriorityPopup
					priorityName={task ? task?.priority : priority}
					visible={openModal}
					setSelectedPriority={(e) => onChangePriority(e.value)}
					onDismiss={() => setOpenModal(false)}
					anchor={anchor}
					canCreatePriority={canCreatePriority}
				/>
				<TouchableOpacity onPress={() => openFromAnchor(() => setOpenModal(true))}>
					<View
						ref={anchorRef}
						collapsable={false}
						style={[{ ...styles.container, ...containerStyle }, look.container]}
					>
						{(task?.priority || priority) && currentPriority ? (
							<View style={styles.wrapStatus}>
								<ChipIcon item={currentPriority} color={look.ink} kind="priority" />
								<Text style={{ ...styles.text, color: look.ink, marginLeft: 10 }}>
									{limitTextCharaters({
										text: currentPriority.name,
										numChars: 15
									})}
								</Text>
							</View>
						) : (
							<View style={styles.wrapStatus}>
								<Entypo name="circle" size={12} color={look.ink} />
								<Text style={{ ...styles.text, color: look.ink, marginLeft: 5 }}>
									{translate('settingScreen.priorityScreen.priorities')}
								</Text>
							</View>
						)}
						<AntDesign name="down" size={14} color={look.ink} />
					</View>
				</TouchableOpacity>
			</>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 8
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

export default TaskPriority;
