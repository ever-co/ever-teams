import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
	readEmployeeId,
	readLastLogOfAnyDay,
	readTask,
	readTimerStatus,
	readTrackedTotals,
	sendTimeSlot,
	startTimer,
	stopTimer
} from '../data/timer';
import type { StartTarget, TimerLog } from '../data/timer';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import { accountOf, sessionAtom } from '../state/session';
import type { Session } from '../state/session';
import { forgetRun, writeRunTimeBeforeStop } from './heartbeat';

// The web reads the timer every 30 s; the query client reads it again when the app comes back to the foreground
const STATUS_REFRESH_MS = 30_000;
// A task's number and title hardly change while Home is open
const TASK_STALE_MS = 5 * 60 * 1000;

export function useSignedInSession(): Session | undefined {
	const state = useAtomValue(sessionAtom);
	if (state.status !== 'signed-in') {
		return undefined;
	}
	return state.session;
}

function sessionOrFail(session: Session | undefined): Session {
	if (!session) {
		throw new Error('Nobody is signed in');
	}
	return session;
}

function personOf(session: Session | undefined): [string, string, string] {
	if (!session) {
		return ['', '', ''];
	}
	return [session.tenantId ?? '', session.organizationId ?? '', accountOf(session)];
}

/**
 * The keys of what Home reads: each carries the workspace and the person, so the answers saved for another workspace,
 * or for someone who used the phone before, never show.
 */
export const homeKeys = {
	status: (session?: Session) => ['home', 'timer-status', ...personOf(session)] as const,
	employee: (session?: Session) => ['home', 'employee', ...personOf(session)] as const,
	totals: (session?: Session, employeeId?: string | null) =>
		['home', 'totals', ...personOf(session), employeeId ?? ''] as const,
	task: (session?: Session, taskId?: string | null) => ['home', 'task', ...personOf(session), taskId ?? ''] as const,
	lastLog: (session?: Session, employeeId?: string | null) =>
		['home', 'last-log', ...personOf(session), employeeId ?? ''] as const
};

export function useTimerStatus() {
	const session = useSignedInSession();
	return useQuery({
		queryKey: homeKeys.status(session),
		queryFn: () => readTimerStatus(sessionOrFail(session), new Date()),
		enabled: session !== undefined,
		refetchInterval: STATUS_REFRESH_MS
	});
}

export function useEmployeeId() {
	const session = useSignedInSession();
	return useQuery({
		queryKey: homeKeys.employee(session),
		queryFn: () => readEmployeeId(sessionOrFail(session)),
		enabled: session !== undefined,
		staleTime: Infinity
	});
}

function employeeIdOrFail(employeeId: string | null | undefined): string {
	if (!employeeId) {
		throw new Error('The person is no employee here');
	}
	return employeeId;
}

/** Today's and this week's tracked seconds of the person, read again with the status. */
export function useTrackedTotals() {
	const session = useSignedInSession();
	const employee = useEmployeeId();
	const employeeId = employee.data;
	return useQuery({
		queryKey: homeKeys.totals(session, employeeId),
		queryFn: () => readTrackedTotals(sessionOrFail(session), employeeIdOrFail(employeeId), new Date()),
		enabled: session !== undefined && Boolean(employeeId),
		refetchInterval: STATUS_REFRESH_MS
	});
}

/** The log Home starts again from, and where the read of an earlier day's log stands. */
export interface LastLogRead {
	log?: TimerLog;
	/** The earlier day's log is still being read. */
	isLoading: boolean;
	/** The earlier day's log could not be read: Home cannot tell whether there is a task to start again. */
	isError: boolean;
	/** Reads the earlier day's log again, when it is the one Home needs. */
	retry: () => Promise<unknown>;
}

/**
 * The log Home starts again from: today's, or else the last one of an earlier day, read only when today has none.
 */
export function useLastLog(todaysLog: TimerLog | undefined, todayRead: boolean): LastLogRead {
	const session = useSignedInSession();
	const employeeId = useEmployeeId().data;
	const canRead = session !== undefined && Boolean(employeeId);
	const todayHasNone = todayRead && !todaysLog;
	const readsEarlierDay = canRead && todayHasNone;
	const earlier = useQuery({
		queryKey: homeKeys.lastLog(session, employeeId),
		queryFn: () => readLastLogOfAnyDay(sessionOrFail(session), employeeIdOrFail(employeeId)),
		enabled: readsEarlierDay
	});
	// a refetch runs even a disabled query: the earlier day is read again only when Home needs it
	const retry = (): Promise<unknown> => (readsEarlierDay ? earlier.refetch() : Promise.resolve(undefined));
	if (todaysLog) {
		return { log: todaysLog, isLoading: false, isError: false, retry };
	}
	const hasNoAnswer = earlier.data === undefined;
	return {
		log: earlier.data ?? undefined,
		isLoading: readsEarlierDay && hasNoAnswer && !earlier.isError,
		isError: readsEarlierDay && hasNoAnswer && earlier.isError,
		retry
	};
}

function taskIdOrFail(taskId: string | null | undefined): string {
	if (!taskId) {
		throw new Error('No task to read');
	}
	return taskId;
}

/** The task the running or last log names. */
export function useLogTask(taskId: string | null | undefined) {
	const session = useSignedInSession();
	return useQuery({
		queryKey: homeKeys.task(session, taskId),
		queryFn: () => readTask(sessionOrFail(session), taskIdOrFail(taskId)),
		enabled: session !== undefined && Boolean(taskId),
		staleTime: TASK_STALE_MS
	});
}

function useReadTimeAgain(): () => Promise<void> {
	const queryClient = useQueryClient();
	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['home', 'timer-status'] }),
			queryClient.invalidateQueries({ queryKey: ['home', 'totals'] })
		]);
	};
}

/**
 * Start and stop are sent at once or fail: without network they fail instead of waiting, since a start sent later
 * would begin when the network came back, not when the person tapped it (the offline outbox is MOB-13).
 */
export function useStartTimer() {
	const session = useSignedInSession();
	const readTimeAgain = useReadTimeAgain();
	return useMutation({
		mutationFn: (target: StartTarget) => startTimer(sessionOrFail(session), target),
		onSettled: readTimeAgain,
		networkMode: 'always'
	});
}

/**
 * Writes the time since the last heartbeat before the stop: the run's last minute, or a run shorter than one, would
 * otherwise have no time slot from the phone. A write that fails does not hold the stop back.
 */
async function writeLastMinute(session: Session, employeeId: string | null | undefined, running?: TimerLog) {
	if (!employeeId) {
		return;
	}
	const source = running?.source ?? TimerSource.MOBILE;
	try {
		await writeRunTimeBeforeStop((seconds) => sendTimeSlot(session, { employeeId, source, seconds }));
	} catch {
		// the run's time up to the last heartbeat is written; the stop goes on
	}
}

export function useStopTimer() {
	const session = useSignedInSession();
	const employeeId = useEmployeeId().data;
	const readTimeAgain = useReadTimeAgain();
	return useMutation({
		mutationFn: async (running: TimerLog | undefined) => {
			const signedIn = sessionOrFail(session);
			await writeLastMinute(signedIn, employeeId, running);
			await stopTimer(signedIn, running);
			// stopped: the heartbeat lets go of the run, which a stop that failed leaves to it
			forgetRun();
		},
		onSettled: readTimeAgain,
		networkMode: 'always'
	});
}
