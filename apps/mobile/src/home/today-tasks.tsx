import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { translate } from '../../app/i18n';
import { useShellTheme } from '../components/screen-state';
import type { TimerLog, TodayTask } from '../data/timer';
import type { Theme } from '../theme';
import { hoursAndMinutes } from './duration';
import { FailedRead } from './failed-read';
import { opacityOf, surfaceOf, surfaceStyles } from './surface';
import { useEmployeeId } from './use-home-timer';

/** What a tap on a task says, spoken: a start, or a switch from the task that runs. */
function spokenActionOf(task: TodayTask, switching: boolean): string {
	if (switching) {
		return translate('shell.home.switchToTask', { title: task.title });
	}
	return translate('shell.home.startOnTask', { title: task.title });
}

interface TodayTaskRowProps {
	task: TodayTask;
	/** The timer runs on this task. */
	runsHere: boolean;
	/** The timer runs on another task: a tap switches. */
	switching: boolean;
	enabled: boolean;
	onPress: () => void;
}

/** The mark's colors: filled with the primary color while the timer runs on the task, light otherwise. */
function markColorsOf(theme: Theme, runsHere: boolean): { background: string; ink: string } {
	if (runsHere) {
		return { background: theme.colors.primary, ink: theme.colors['primary-foreground'] };
	}
	return { background: theme.colors.muted, ink: theme.colors['primary-ink'] };
}

/** The start mark in front of a task: filled while the timer runs on it. Decorative: the row's label says the action. */
function StartMark({ runsHere }: Readonly<{ runsHere: boolean }>) {
	const theme = useShellTheme();
	const { background, ink } = markColorsOf(theme, runsHere);
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[styles.mark, { backgroundColor: background }]}
		>
			<Feather name="play" size={14} color={ink} />
		</View>
	);
}

function TodayTaskRow({ task, runsHere, switching, enabled, onPress }: Readonly<TodayTaskRowProps>) {
	const theme = useShellTheme();
	const tappable = enabled && !runsHere;
	return (
		<Pressable
			testID="home-today-task"
			accessibilityRole="button"
			// The row the timer runs on is read as it shows: its title, Running and its time
			accessibilityLabel={runsHere ? undefined : spokenActionOf(task, switching)}
			accessibilityState={{ disabled: !tappable, selected: runsHere }}
			disabled={!tappable}
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				{ minHeight: theme.minimumTouchTarget, opacity: opacityOf(pressed, tappable || runsHere) }
			]}
		>
			<StartMark runsHere={runsHere} />
			<Text
				testID="home-today-task-title"
				numberOfLines={2}
				style={[theme.type.body, styles.title, { color: theme.colors.foreground }]}
			>
				{task.title}
			</Text>
			<View style={styles.trailing}>
				{runsHere && (
					<Text
						testID="home-today-task-running"
						style={[theme.type.hint, { color: theme.colors['primary-ink'] }]}
					>
						{translate('shell.home.runningTask')}
					</Text>
				)}
				<Text style={[theme.type.label, { color: theme.colors['muted-foreground'] }]}>
					{translate('shell.home.duration', hoursAndMinutes(task.seconds))}
				</Text>
			</View>
		</Pressable>
	);
}

function SectionNote({ text }: Readonly<{ text: string }>) {
	const theme = useShellTheme();
	return <Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>{text}</Text>;
}

/** Today's tasks as Home reads them. */
interface TodayTasksRead {
	data?: TodayTask[];
	isError: boolean;
	refetch: () => Promise<unknown>;
}

interface TodayTasksProps {
	tasks: TodayTasksRead;
	/** Today has a time log: without one nothing was tracked today, and the tasks are not read. */
	loggedToday: boolean;
	/** The run going on, when the timer runs. */
	running?: TimerLog;
	/** Starting and stopping need the network and no other timer action under way, Home's Start and Stop included. */
	enabled: boolean;
	/** The last start or switch from this list failed. */
	failed: boolean;
	/** Starts the timer on a task, or switches to it from the run going on: Home owns it with its Start and Stop. */
	onStart: (taskId: string) => void;
}

/**
 * Today's tasks under Home's timer: the tasks the person tracked time on today, with their time, the latest first. A tap
 * starts the timer on one, or switches to it from the task that runs.
 */
export function TodayTasks({ tasks, loggedToday, running, enabled, failed, onStart }: Readonly<TodayTasksProps>) {
	const theme = useShellTheme();
	const employee = useEmployeeId();

	const body = () => {
		if (!loggedToday || tasks.data?.length === 0) {
			return <SectionNote text={translate('shell.home.todayTasksEmpty')} />;
		}
		if (tasks.data) {
			return tasks.data.map((task) => {
				const runsHere = running?.taskId === task.id;
				const switching = Boolean(running) && !runsHere;
				return (
					<TodayTaskRow
						key={task.id}
						task={task}
						runsHere={runsHere}
						switching={switching}
						enabled={enabled}
						onPress={() => onStart(task.id)}
					/>
				);
			});
		}
		// Without an employee the tasks are never read: an account that tracks no time here says so, as the week does
		if (employee.isSuccess && !employee.data) {
			return <SectionNote text={translate('shell.home.weekUnavailable')} />;
		}
		if (employee.isError || tasks.isError) {
			const retry = () => {
				void employee.refetch();
				// Without an employee the tasks have nothing to read yet: they are read once the lookup answers one
				if (employee.data) {
					void tasks.refetch();
				}
			};
			return <FailedRead message={translate('shell.home.todayTasksFailed')} onRetry={retry} />;
		}
		return <SectionNote text={translate('shell.states.loading')} />;
	};

	return (
		<View testID="home-today-tasks" style={[surfaceStyles.card, styles.section, surfaceOf(theme)]}>
			<Text style={[theme.type.label, { color: theme.colors['muted-foreground'] }]}>
				{translate('shell.home.todayTasks')}
			</Text>
			{body()}
			{failed && (
				<View accessibilityLiveRegion="polite" style={styles.failed}>
					<Text style={[theme.type.label, { color: theme.colors['destructive-ink'] }]}>
						{translate('shell.home.switchFailedTitle')}
					</Text>
					<SectionNote text={translate('shell.home.startFailedMessage')} />
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		gap: 8
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 8
	},
	mark: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center'
	},
	title: {
		flex: 1
	},
	trailing: {
		alignItems: 'flex-end',
		gap: 2
	},
	failed: {
		gap: 2
	}
});
