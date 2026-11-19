/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ITeamTask } from '../services/interfaces/ITask';
import { useTeamTasks } from '../services/hooks/features/use-team-tasks';
import { showMessage } from 'react-native-flash-message';
import { typography, useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';
import TaskSizePopup from './task-size-popup';
import { translate } from '../i18n';
import { limitTextCharaters } from '../helpers/sub-text';
import { useTaskSizeValue } from './status-type';

interface TaskSizeProps {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	statusTextSyle?: TextStyle;
	size?: string;
	setSize?: (size: string) => unknown;
	canCreateSize?: boolean;
}

const TaskSize: FC<TaskSizeProps> = observer(({ task, containerStyle, setSize, size, canCreateSize }) => {
	const theme = useWebTheme();
	const { updateTask } = useTeamTasks();
	const [openModal, setOpenModal] = useState(false);

	const allTaskSizes = useTaskSizeValue();

	const sizeValue = (task?.size?.split('-').join(' ') || (size && size.split('-').join(' ')))?.toLowerCase();

	const currentSize =
		allTaskSizes && Object.values(allTaskSizes).find((item) => item.name.toLowerCase() === sizeValue);
	const look = taskChipLookOf(currentSize?.bgColor, theme);

	const onChangeSize = async (text: string) => {
		if (task) {
			const taskEdit = {
				...task,
				size: task?.size === text ? null : text
			};

			const { response } = await updateTask(taskEdit, task.id);
			if (response.status !== 202) {
				showMessage({
					message: translate('common.somethingWrong'),
					type: 'danger'
				});
			}
		} else {
			setSize(text);
		}
	};

	return (
		<>
			<TaskSizePopup
				sizeName={task ? task?.size : size}
				visible={openModal}
				setSelectedSize={(e) => onChangeSize(e.value)}
				onDismiss={() => setOpenModal(false)}
				canCreateSize={canCreateSize}
			/>
			<TouchableOpacity onPress={() => setOpenModal(true)}>
				<View style={[{ ...styles.container, ...containerStyle }, look.container]}>
					{(task?.size || size) && currentSize ? (
						<View style={styles.wrapStatus}>
							{currentSize.icon}
							<Text style={{ ...styles.text, color: look.ink, marginLeft: 10 }}>
								{limitTextCharaters({ text: currentSize.name, numChars: 15 })}
							</Text>
						</View>
					) : (
						<View style={styles.wrapStatus}>
							<Entypo name="circle" size={12} color={look.ink} />
							<Text style={{ ...styles.text, color: look.ink, marginLeft: 5 }}>
								{translate('settingScreen.sizeScreen.sizes')}
							</Text>
						</View>
					)}
					<AntDesign name="down" size={14} color={look.ink} />
				</View>
			</TouchableOpacity>
		</>
	);
});

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

export default TaskSize;
