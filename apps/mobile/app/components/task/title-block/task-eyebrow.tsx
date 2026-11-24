import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { typography, useWebTheme } from '../../../theme';
import IssuesModal from '../../issues-modal';
import type { ITeamTask } from '../../../services/interfaces/ITask';
import { createdDayOf } from './created-day';

type TaskEyebrowProps = { task: ITeamTask; teamName?: string };

/** The line above a task's title, as on the web: its type, its team, its number and the day it was created. */
export const TaskEyebrow = observer(function TaskEyebrow({ task, teamName }: TaskEyebrowProps) {
	const theme = useWebTheme();
	const muted = { color: theme.colors['muted-foreground'] };
	const createdDay = createdDayOf(task?.createdAt);
	return (
		<View testID="task-eyebrow" style={styles.eyebrow}>
			<IssuesModal task={task} nameIncluded={true} smallFont={true} />
			{teamName ? (
				<Text numberOfLines={1} style={[styles.text, styles.team, muted]}>
					{teamName}
				</Text>
			) : null}
			<Text style={[styles.text, styles.number, muted]}>#{task?.number}</Text>
			{createdDay ? <Text style={[styles.text, muted]}>{createdDay}</Text> : null}
		</View>
	);
});

const styles = StyleSheet.create({
	eyebrow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10
	},
	number: {
		fontVariant: ['tabular-nums']
	},
	team: {
		flexShrink: 1
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 13
	}
});
