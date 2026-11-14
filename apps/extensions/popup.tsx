import React, { useCallback, useEffect, useState } from 'react';

import Header from '~components/popup/Header';
import SignIn from '~components/popup/SignIn';
import Tasks from '~components/popup/Tasks';
import Timer from '~components/popup/Timer';
import { SpinnerIcon } from '~components/shared/Icons';
import { useSession } from '~hooks/useSession';
import { useTasks } from '~hooks/useTasks';
import { useTimerStatus } from '~hooks/useTimerStatus';
import { ApiError } from '~lib/api-client';
import {
	EXTENSION_SOURCE,
	getTimerStatus,
	type RunningLog,
	myPlans,
	sendHeartbeat,
	startTimer,
	stopTimer,
	teamRequiresPlan,
	todayPlanDay
} from '~lib/gauzy';
import { t } from '~lib/i18n';
import { planRefusalOf } from '~lib/plan-rule';
import { refusalOf, type Refusal } from '~lib/refusal';
import { sendsHeartbeat } from '~lib/run-policy';
import { loadSettings, type Settings } from '~lib/session-store';
import type { Session } from '~lib/workspaces';
import browser from '~misc/browser';

import './style.css';

function refusalFrom(error: unknown): Refusal {
	if (error instanceof ApiError) {
		return refusalOf(error);
	}
	return { key: 'errorGeneric' };
}

/**
 * Credits a run's last seconds before its stop, from a fresh read: the popup's copy of the run can predate the
 * background's last heartbeat, and would credit that minute again. A failed credit must not keep the timer running.
 */
async function creditLastSeconds(session: Session, run: RunningLog): Promise<void> {
	const fresh = await getTimerStatus(session).catch(() => null);
	const freshRun = fresh?.lastLog;
	const isSameRun = freshRun?.id === run.id;
	if (!isSameRun || !freshRun) {
		return;
	}
	await sendHeartbeat(session, freshRun).catch(() => undefined);
}

/** The run the clock counts: the last log while the timer runs, none otherwise. */
function runningLogOf(isRunning: boolean, lastLog: RunningLog | null | undefined): RunningLog | null {
	if (!isRunning) {
		return null;
	}
	return lastLog ?? null;
}

/** The title of what the clock shows: the running task, else the task picked to start. */
function shownTaskTitle(runningTitle: string | null | undefined, selectedTitle: string | undefined): string | null {
	if (runningTitle) {
		return runningTitle;
	}
	return selectedTitle ?? null;
}

function SignedIn({
	session,
	settings,
	onSignOut,
	onTeamSelect
}: {
	session: Session;
	settings: Settings;
	onSignOut: () => void;
	onTeamSelect: (teamId: string) => void;
}) {
	const timer = useTimerStatus(session);
	const tasks = useTasks(session);
	const [busy, setBusy] = useState(false);

	const running = runningLogOf(timer.isRunning, timer.status?.lastLog);
	const runningTask = tasks.tasks.find((task) => task.id === running?.taskId);
	const startedElsewhere = Boolean(running && running.source !== EXTENSION_SOURCE);
	const taskTitle = shownTaskTitle(running?.task?.title ?? runningTask?.title, tasks.selectedTask?.title);
	const canStart = Boolean(tasks.selectedTask);

	const act = useCallback(
		async (work: () => Promise<void>) => {
			setBusy(true);
			timer.setRefusal(null);
			try {
				await work();
			} catch (error) {
				timer.setRefusal(refusalFrom(error));
			} finally {
				await timer.refresh();
				setBusy(false);
			}
		},
		[timer]
	);

	const onStart = () => {
		const task = tasks.selectedTask;
		if (!task) {
			return;
		}
		void act(async () => {
			// The API does not hold this source to the plan rule: a failed read refuses the start rather than skip it
			const requiresPlan = await teamRequiresPlan(session);
			if (requiresPlan) {
				const refusalCode = planRefusalOf({
					teamRequiresPlan: true,
					plans: await myPlans(session),
					taskId: task.id,
					planDay: todayPlanDay()
				});
				if (refusalCode) {
					timer.setRefusal(refusalOf({ status: 422, code: refusalCode }));
					return;
				}
			}
			await startTimer(session, task);
			await tasks.rememberStart(task.id);
		});
	};

	const onStop = () => {
		if (!running) {
			return;
		}
		void act(async () => {
			if (sendsHeartbeat(running)) {
				await creditLastSeconds(session, running);
			}
			await stopTimer(session, running);
		});
	};

	const onCheckTeam = () => {
		void browser.tabs.create({ url: settings.appUrl });
	};

	if (timer.loading) {
		return (
			<p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
				<SpinnerIcon className="h-4 w-4" />
				{t('timerLoading')}
			</p>
		);
	}

	return (
		<>
			<Header
				session={session}
				teamLocked={timer.isRunning || busy}
				onTeamSelect={onTeamSelect}
				onOpenSettings={() => void browser.runtime.openOptionsPage()}
				onSignOut={onSignOut}
			/>
			<Timer
				isRunning={timer.isRunning}
				runSeconds={timer.runSeconds}
				todaySeconds={timer.todaySeconds}
				taskTitle={taskTitle}
				startedElsewhere={startedElsewhere}
				canStart={canStart}
				busy={busy}
				refusal={timer.error}
				onStart={onStart}
				onStop={onStop}
				onCheckTeam={onCheckTeam}
				onRetry={() => void timer.refresh()}
			/>
			<Tasks
				session={session}
				tasks={tasks.tasks}
				loading={tasks.loading}
				error={tasks.error}
				recentIds={tasks.recentIds}
				selectedTaskId={tasks.selectedTask?.id ?? null}
				locked={timer.isRunning || busy}
				onSelect={(taskId) => void tasks.selectTask(taskId)}
				onCreated={(task) => void tasks.addCreated(task)}
				onRetry={() => void tasks.reload()}
			/>
		</>
	);
}

function IndexPopup() {
	const { session, loading, signedIn, signOut, selectTeam } = useSession();
	const [settings, setSettings] = useState<Settings | null>(null);

	useEffect(() => {
		void loadSettings().then(setSettings);
	}, []);

	const isReady = !loading && settings !== null;

	return (
		<main className="flex w-[360px] flex-col gap-3 bg-zinc-50 p-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
			{!isReady && (
				<p className="flex items-center justify-center py-10" role="status" aria-label={t('timerLoading')}>
					<SpinnerIcon className="h-5 w-5 text-zinc-400" />
				</p>
			)}
			{isReady && !session && (
				<SignIn
					apiUrl={settings.apiUrl}
					onSignedIn={signedIn}
					onOpenSettings={() => void browser.runtime.openOptionsPage()}
				/>
			)}
			{isReady && session && (
				<SignedIn
					session={session}
					settings={settings}
					onSignOut={() => void signOut()}
					onTeamSelect={(teamId) => void selectTeam(teamId)}
				/>
			)}
		</main>
	);
}

export default IndexPopup;
