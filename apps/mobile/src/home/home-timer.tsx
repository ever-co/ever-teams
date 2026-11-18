import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentLocale, translate } from '../../app/i18n';
import { ErrorState, LoadingState, useIsOnline, useShellTheme } from '../components/screen-state';
import type { TimerLog, TimerTask } from '../data/timer';
import type { Theme } from '../theme';
import { hoursAndMinutes } from './duration';
import { TimerDigits } from './timer-digits';
import { useLogTask, useStartTimer, useStopTimer, useTimerStatus, useTrackedTotals } from './use-home-timer';

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

function TimerButton({ running, enabled, onPress }: { running: boolean; enabled: boolean; onPress: () => void }) {
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

function TaskOfTheLog({ log, task, running }: { log?: TimerLog; task?: TimerTask; running: boolean }) {
	const theme = useShellTheme();
	if (!log?.taskId) {
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
		</View>
	);
}

function ActionFailure({ title, message }: { title: string; message: string }) {
	const theme = useShellTheme();
	return (
		<View accessibilityLiveRegion="polite" style={styles.failure}>
			<Text style={[theme.type.label, { color: theme.colors['destructive-ink'] }]}>{title}</Text>
			<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>{message}</Text>
		</View>
	);
}

function WeekTotal() {
	const theme = useShellTheme();
	const totals = useTrackedTotals();
	return (
		<View style={[styles.surface, styles.week, surfaceOf(theme)]}>
			<Text style={[theme.type.label, { color: theme.colors['muted-foreground'] }]}>
				{translate('shell.home.thisWeek')}
			</Text>
			{totals.data && (
				<Text testID="home-week-total" style={[theme.type.stat, { color: theme.colors.foreground }]}>
					{durationText(totals.data.weekDuration)}
				</Text>
			)}
			{!totals.data && (
				<Text style={[theme.type.hint, { color: theme.colors['muted-foreground'] }]}>
					{translate('shell.states.loading')}
				</Text>
			)}
		</View>
	);
}

/** Home: today's tracked time, the task the timer runs on or ran last, Start or Stop, and this week's total. */
export function HomeTimer() {
	const theme = useShellTheme();
	const online = useIsOnline();
	const status = useTimerStatus();
	const totals = useTrackedTotals();
	const lastLog = status.data?.lastLog;
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
		await Promise.all([status.refetch(), totals.refetch()]);
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
				<TaskOfTheLog log={lastLog} task={task.data} running={running} />
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
	week: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12
	}
});
