import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { readEmployeeId, readTask, readTimerStatus, readTrackedTotals, startTimer, stopTimer } from '../data/timer';
import type { StartTarget, TimerLog } from '../data/timer';
import { sessionAtom } from '../state/session';
import type { Session } from '../state/session';

// The web reads the timer every 30 s; the query client reads it again when the app comes back to the foreground
const STATUS_REFRESH_MS = 30_000;
// A task's number and title hardly change while Home is open
const TASK_STALE_MS = 5 * 60 * 1000;

function useSignedInSession(): Session | undefined {
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

function workspaceOf(session: Session | undefined): [string, string] {
	return [session?.tenantId ?? '', session?.organizationId ?? ''];
}

/** The keys of what Home reads: each carries the workspace, so another workspace never shows this one's answers. */
export const homeKeys = {
	status: (session?: Session) => ['home', 'timer-status', ...workspaceOf(session)] as const,
	employee: (session?: Session) => ['home', 'employee', ...workspaceOf(session)] as const,
	totals: (session?: Session, employeeId?: string | null) =>
		['home', 'totals', ...workspaceOf(session), employeeId ?? ''] as const,
	task: (session?: Session, taskId?: string | null) =>
		['home', 'task', ...workspaceOf(session), taskId ?? ''] as const
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

function useEmployeeId() {
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

export function useStopTimer() {
	const session = useSignedInSession();
	const readTimeAgain = useReadTimeAgain();
	return useMutation({
		mutationFn: (running: TimerLog | undefined) => stopTimer(sessionOrFail(session), running),
		onSettled: readTimeAgain,
		networkMode: 'always'
	});
}
