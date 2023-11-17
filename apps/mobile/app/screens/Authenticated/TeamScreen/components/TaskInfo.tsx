/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { typography, useAppTheme } from '../../../../theme';
import { useTeamTasks } from '../../../../services/hooks/features/useTeamTasks';
import { I_TeamMemberCardHook } from '../../../../services/hooks/features/useTeamMemberCard';
import { Feather } from '@expo/vector-icons';
import IssuesModal from '../../../../components/IssuesModal';

const TaskInfo = ({
	memberInfo,
	editMode,
	setEditMode,
	onPressIn
}: {
	memberInfo: I_TeamMemberCardHook;
	editMode: boolean;
	setEditMode: (value: boolean) => unknown;
	onPressIn: () => void;
}) => {
	const task = memberInfo.memberTask;
	const { colors } = useAppTheme();
	const [taskTitle, setTaskTitle] = useState(task?.title || '');
	const { updateTask, teamTasks } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const titleChanged = taskTitle !== task?.title;

	const onChangeTitle = useCallback(async () => {
		if (titleChanged && task) {
			setLoading(true);
			await updateTask(
				{
					...teamTasks.find((t) => t.id === task.id),
					title: taskTitle
				},
				task.id
			);
			setLoading(false);
			setEditMode(false);
		}
	}, []);

	if (editMode) {
		return (
			<View style={{ ...styles.wrapTaskTitle, borderColor: colors.border }}>
				<TextInput
					defaultValue={taskTitle}
					style={{ ...styles.inputTitle, color: colors.primary }}
					onChangeText={(text) => setTaskTitle(text)}
				/>
				{titleChanged && !loading && (
					<TouchableOpacity onPress={() => onChangeTitle()}>
						<Feather size={24} name="check" color="green" />
					</TouchableOpacity>
				)}
				{loading && <ActivityIndicator size={'small'} color={colors.primary} />}
			</View>
		);
	}

	return (
		<TouchableOpacity onLongPress={() => setEditMode(true)} onPress={onPressIn}>
			<View style={{ flexDirection: 'row', width: '100%' }}>
				<View style={styles.wrapBugIcon}>
					<IssuesModal task={task} readonly={true} />
				</View>
				{task ? (
					<Text style={[styles.otherText, { color: colors.primary }]}>
						<Text style={styles.taskNumberStyle}>#{task?.taskNumber}</Text>{' '}
						{limitTextCharaters({
							text: task.title,
							numChars: 64
						})}
					</Text>
				) : null}
			</View>
		</TouchableOpacity>
	);
};

export default TaskInfo;

const styles = StyleSheet.create({
	inputTitle: {
		minHeight: 30,
		width: '80%'
	},
	otherText: {
		color: '#282048',
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		fontStyle: 'normal',
		width: '95%'
	},
	taskNumberStyle: {
		color: '#7B8089',
		fontFamily: typography.primary.semiBold,
		fontSize: 14
	},
	wrapBugIcon: {
		alignItems: 'center',
		borderRadius: 3,
		height: 20,
		justifyContent: 'center',
		marginRight: 3,
		width: 20
	},
	wrapTaskTitle: {
		alignItems: 'center',
		borderRadius: 6,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 8,
		paddingVertical: 4,
		width: '100%'
	}
});
