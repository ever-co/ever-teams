import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentLocale, translate } from '../../app/i18n';
import { ErrorState, LoadingState, useIsOnline, useShellTheme } from '../components/screen-state';
import type { TimerLog, TimerTask } from '../data/timer';
import type { Theme } from '../theme';
import { hoursAndMinutes } from './duration';
import { TimerDigits } from './timer-digits';
import {
	useEmployeeId,
	useLastLog,
	useLogTask,
	useStartTimer,
	useStopTimer,
	useTimerStatus,
	useTrackedTotals
} from './use-home-timer';

const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

function opacityOf(pressed: boolean, enabled: boolean): number {
	if (!enabled) {
		return DISABLED_OPACITY;
	}
	if (pressed) {
		return PRESSED_OPACITY;
	}
	return 1;
}

function dayLine(now: Date): string {
	return new Intl.DateTimeFormat(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
}

function timeOfDay(iso: string): string {
	return new Intl.DateTimeFormat(currentLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function taskLabelOf(running: boolean): string {
	if (running) {
		return translate('shell.home.currentTask');
	}
	return translate('shell.home.lastTask');
}

function durationText(seconds: number): string {
	return translate('shell.home.duration', hoursAndMinutes(seconds));
}

function surfaceOf(theme: Theme) {
	return {
		backgroundColor: theme.colors.card,
		borderColor: theme.colors.border,
		borderRadius: theme.radius.sheet
	};
}

interface ButtonLook {
	label: string;
	spoken: string;
	container: { backgroundColor: string; borderColor: string };
	text: string;
}

function buttonLookOf(theme: Theme, running: boolean): ButtonLook {
	if (running) {
		return {
			label: translate('shell.home.stop'),
			spoken: translate('timer.stopLabel'),
			container: { backgroundColor: theme.colors.card, borderColor: theme.colors.destructive },
			text: theme.colors['destructive-ink']
		};
	}
	return {
		label: translate('shell.home.start'),
		spoken: translate('timer.startLabel'),
		container: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
		text: theme.colors['primary-foreground']
	};
}

function TimerButton({
	running,
	enabled,
	onPress
}: Readonly<{ running: boolean; enabled: boolean; onPress: () => void }>) {
	const theme = useShellTheme();
	const look = buttonLookOf(theme, running);
	return (
		<Pressable
			testID="home-timer-button"
			accessibilityRole="button"
			accessibilityLabel={look.spoken}
			accessibilityState={{ disabled: !enabled }}
			disabled={!enabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				look.container,
				{
					minHeight: theme.minimumTouchTarget,
					borderRadius: theme.radius.control,
					opacity: opacityOf(pressed, enabled)
				}
			]}
		>
			<Text style={[theme.type.label, { color: look.text }]}>{look.label}</Text>
		</Pressable>
	);
}

/** A read that failed: what did not load, and a way to read it again. */
function FailedRead({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
	const theme = useShellTheme();
	return (
		<View accessibilityLiveRegion="polite" style={styles.failedRead}>
			<Text style={[theme.type.hint, styles.failedMessage, { color: theme.colors['destructive-ink'] }]}>
				{message}
			</Text>
			<Pressable
				accessibilityRole="button"
				onPress={onRetry}
				style={({ pressed }) => [
					styles.retry,
					{ minHeight: theme.minimumTouchTarget, opacity: opacityOf(pressed, true) }
				]}
			>
				<Text style={[theme.type.label, { color: theme.colors['primary-ink'] }]}>
					{translate('shell.states.retry')}
				</Text>
			</Pressable>
		</View>
	);
}

interface TaskOfTheLogProps {
	log?: TimerLog;
	task?: TimerTask;
	running: boolean;
	/** The task, or the earlier day's log that names it, is still being read. */
	loading: boolean;
	/** The task, or the earlier day's log that names it, could not be read. */
	failed: boolean;
	onRetry: () => void;
}

function TaskOfTheLog({ log, task, running, loading, failed, onRetry }: Readonly<TaskOfTheLogProps>) {
	const theme = useShellTheme();
	// A read that is under way or failed is never shown as "no time tracked yet"
	if (!log?.taskId && !loading && !failed) {
		return (
			<View style={styles.task}>
				<Text style={[theme.type.label, { color: theme.colors.foreground }]}>
					{translate('shell.home.noTaskTitle')}
				</Text>
				<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>
					{translate('shell.home.noTaskMessage')}
				</Text>
			</View>
		);
	}
	return (
		<View style={styles.task}>
			<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>{taskLabelOf(running)}</Text>
			{task && (
				<Text numberOfLines={2} style={[theme.type.body, { color: theme.colors.foreground }]}>
					{task.taskNumber && (
						<Text style={{ color: theme.colors['muted-foreground'] }}>{`${task.taskNumber} `}</Text>
					)}
					{task.title}
				</Text>
			)}
			{loading && (
				<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>
					{translate('shell.states.loading')}
				</Text>
			)}
			{failed && <FailedRead message={translate('shell.home.taskFailed')} onRetry={onRetry} />}
		</View>
	);
}

function ActionFailure({ title, message }: Readonly<{ title: string; message: string }>) {
	const theme = useShellTheme();
	return (
		<View accessibilityLiveRegion="polite" style={styles.failure}>
			<Text style={[theme.type.label, { color: theme.colors['destructive-ink'] }]}>{title}</Text>
			<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>{message}</Text>
		</View>
	);
}

/** This week's total, or why it is not there: loading, a read that failed, or an account that tracks no time here. */
function WeekValue() {
	const theme = useShellTheme();
	const employee = useEmployeeId();
	const totals = useTrackedTotals();
	if (totals.data) {
		return (
			<Text testID="home-week-total" style={[theme.type.stat, { color: theme.colors.foreground }]}>
				{durationText(totals.data.weekDuration)}
			</Text>
		);
	}
	const noEmployee = employee.isSuccess && !employee.data;
	if (noEmployee) {
		return (
			<Text style={[theme.type.hint, styles.weekNote, { color: theme.colors['muted-foreground'] }]}>
				{translate('shell.home.weekUnavailable')}
			</Text>
		);
	}
	const failed = employee.isError || totals.isError;
	if (failed) {
		const retry = () => {
			void employee.refetch();
			// Without an employee the totals have nothing to read yet: they are read once the lookup answers one
			if (employee.data) {
				void totals.refetch();
			}
		};
		return <FailedRead message={translate('shell.home.weekFailed')} onRetry={retry} />;
	}
	return (
		<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>
			{translate('shell.states.loading')}
		</Text>
	);
}

function WeekTotal() {
	const theme = useShellTheme();
	return (
		<View style={[styles.surface, styles.week, surfaceOf(theme)]}>
			<Text style={[theme.type.label, { color: theme.colors['muted-foreground'] }]}>
				{translate('shell.home.thisWeek')}
			</Text>
			<WeekValue />
		</View>
	);
}

/** Home: today's tracked time, the task the timer runs on or ran last, Start or Stop, and this week's total. */
export function HomeTimer() {
	const theme = useShellTheme();
	const online = useIsOnline();
	const status = useTimerStatus();
	const employee = useEmployeeId();
	const totals = useTrackedTotals();
	const lastLogRead = useLastLog(status.data?.lastLog, status.isSuccess);
	const lastLog = lastLogRead.log;
	const task = useLogTask(lastLog?.taskId);
	const start = useStartTimer();
	const stop = useStopTimer();
	const [refreshing, setRefreshing] = useState(false);

	if (!status.data) {
		if (status.isError) {
			return <ErrorState onRetry={() => void status.refetch()} />;
		}
		return <LoadingState />;
	}

	const running = status.data.running;
	const hasTask = Boolean(lastLog?.taskId);
	const actionable = running || hasTask;
	const free = online && !start.isPending && !stop.isPending;
	const enabled = free && actionable;
	// The task area waits for, or says it could not read, the task the log names, or the earlier day's log itself
	const taskLoading = hasTask ? !task.data && !task.isError : lastLogRead.isLoading;
	const taskFailed = hasTask ? !task.data && task.isError : lastLogRead.isError;
	const readTaskAgain = () => (hasTask ? task.refetch() : lastLogRead.retry());

	const onPress = () => {
		if (running) {
			stop.mutate(lastLog);
			return;
		}
		if (lastLog?.taskId) {
			start.mutate({ taskId: lastLog.taskId, organizationTeamId: lastLog.organizationTeamId });
		}
	};

	const refresh = async () => {
		setRefreshing(true);
		// Only what there is to read: a refetch runs even a disabled query, so the totals without an employee, or the task
		// of a log without one, would fail after their retries and hold the spinner for seconds
		await Promise.all([
			status.refetch(),
			employee.refetch(),
			employee.data ? totals.refetch() : undefined,
			readTaskAgain()
		]);
		setRefreshing(false);
	};

	return (
		<ScrollView
			contentContainerStyle={styles.content}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
		>
			<View style={[styles.surface, styles.timer, surfaceOf(theme)]}>
				<Text style={[theme.type.hint, styles.centered, { color: theme.colors['muted-foreground'] }]}>
					{dayLine(new Date())}
				</Text>
				<Text style={[theme.type.label, styles.centered, { color: theme.colors['muted-foreground'] }]}>
					{translate('shell.home.today')}
				</Text>
				<TimerDigits counted={status.data.duration} countedAt={status.dataUpdatedAt} running={running} />
				{running && lastLog && (
					<Text
						testID="home-running-since"
						style={[theme.type.hint, styles.centered, { color: theme.colors['muted-foreground'] }]}
					>
						{translate('shell.home.runningSince', { time: timeOfDay(lastLog.startedAt) })}
					</Text>
				)}
				<View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
				<TaskOfTheLog
					log={lastLog}
					task={task.data}
					running={running}
					loading={taskLoading}
					failed={taskFailed}
					onRetry={() => void readTaskAgain()}
				/>
				<TimerButton running={running} enabled={enabled} onPress={onPress} />
				{start.isError && (
					<ActionFailure
						title={translate('shell.home.startFailedTitle')}
						message={translate('shell.home.startFailedMessage')}
					/>
				)}
				{stop.isError && (
					<ActionFailure
						title={translate('timer.stopFailedTitle')}
						message={translate('timer.stopFailedMessage')}
					/>
				)}
				{!online && (
					<Text style={[theme.type.hint, styles.centered, { color: theme.colors['muted-foreground'] }]}>
						{translate('shell.home.needsNetwork')}
					</Text>
				)}
			</View>
			<WeekTotal />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		padding: 16,
		gap: 12
	},
	surface: {
		borderWidth: StyleSheet.hairlineWidth,
		padding: 16,
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.065)'
	},
	timer: {
		gap: 8
	},
	centered: {
		textAlign: 'center'
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 4
	},
	task: {
		gap: 2
	},
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		paddingHorizontal: 20,
		marginTop: 4
	},
	failure: {
		gap: 2
	},
	failedRead: {
		flexShrink: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		columnGap: 8
	},
	failedMessage: {
		flexShrink: 1
	},
	retry: {
		justifyContent: 'center',
		paddingHorizontal: 8
	},
	weekNote: {
		flexShrink: 1
	},
	week: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12
	}
});
