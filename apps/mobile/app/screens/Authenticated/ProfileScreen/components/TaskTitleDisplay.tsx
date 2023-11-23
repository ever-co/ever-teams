/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import { typography, useAppTheme } from '../../../../theme';
import { AntDesign } from '@expo/vector-icons';
import { useTeamTasks } from '../../../../services/hooks/features/useTeamTasks';

interface Props {
	editMode: boolean;
	setEditMode: (s: boolean) => unknown;
	task: ITeamTask;
	navigateToTask: (taskId: string) => void;
}

const TaskTitleDisplay: FC<Props> = ({ editMode, setEditMode, task, navigateToTask }) => {
	const { colors } = useAppTheme();
	const { updateTask } = useTeamTasks();
	const [taskTitle, setTaskTitle] = useState(task.title);
	const [loading, setLoading] = useState(false);

	const taskTitleChanged = task.title === taskTitle;

	const onChangeTitle = async (text: string) => {
		setLoading(true);
		await updateTask(
			{
				...task,
				title: taskTitle
			},
			task.id
		);
		setTaskTitle(text);
		setLoading(false);
		setEditMode(false);
	};

	if (editMode) {
		return (
			<View style={styles.wrapTitleInput}>
				<TextInput
					defaultValue={taskTitle}
					value={taskTitle}
					multiline={true}
					numberOfLines={2}
					autoCorrect={false}
					autoComplete={'off'}
					onChangeText={(text) => setTaskTitle(text)}
					style={{ ...styles.titleInput, color: colors.primary, borderColor: colors.border }}
				/>
				{!taskTitleChanged && !loading && (
					<TouchableOpacity onPress={() => onChangeTitle(taskTitle)}>
						<AntDesign name="check" size={24} color="#27AE60" />
					</TouchableOpacity>
				)}
				{loading && <ActivityIndicator size={'small'} />}
			</View>
		);
	}

	return (
		<TouchableOpacity onLongPress={() => setEditMode(true)} onPress={() => navigateToTask(task?.id)}>
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<Text style={[styles.totalTimeTitle, { marginRight: 5 }]}>#{task.number}</Text>
					<Text style={[styles.totalTimeTitle, { color: colors.primary }]}>
						{limitTextCharaters({
							text: task.title,
							numChars: 43
						})}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {},
	titleContainer: {
		flexDirection: 'row',
		width: '100%'
	},
	titleInput: {
		borderRadius: 8,
		borderWidth: 1,
		height: 40,
		padding: 8,
		width: '78%'
	},
	totalTimeTitle: {
		color: '#7E7991',
		fontFamily: typography.secondary.medium,
		fontSize: 14,
		maxWidth: '78%'
	},
	wrapTitleInput: {
		alignItems: 'center',
		flexDirection: 'row'
	}
});
export default TaskTitleDisplay;
