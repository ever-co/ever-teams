import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import moment from 'moment';
import qs from 'qs';
import { APIService, getFallbackAPI } from '../../api.service';

import { getActiveTaskIdCookie } from '@/core/lib/helpers/cookies';
import { getTodayPlanDay } from '@/core/lib/helpers/daily-plan-day';
import {
	isSentTimeSlotHeld,
	type SentTimeSlot,
	TIME_SLOT_WINDOW_MS,
	timeSlotsBetween,
	timeSlotWindowStartOf,
	toTimeSlotDuration
} from '@/core/lib/helpers/timer';
import type { ITimeSlot } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { ITimerStatus, IToggleTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { TUser } from '@/core/types/schemas';
import { scopedReadConfig, type ScopedReadOptions } from '../../api-request-scope';
import { type TimerStartMoveSupport, timerStartMoveSupportOf } from '@/core/lib/utils/timer/timer-start-move';

// Without these bounds Gauzy counts "today" from the API server's midnight, not the user's.
// One clock read for both bounds, so a call at midnight cannot span two days.
const getTodayRangeQuery = () => {
	const now = moment();

	return qs.stringify({
		todayStart: now.clone().startOf('day').toISOString(),
		todayEnd: now.clone().endOf('day').toISOString()
	});
};

// Reports read the project from the time log, never from its task: a log saved without it shows under no project
const projectFieldOf = (projectId?: string | null): { projectId?: string } => {
	if (!projectId) {
		return {};
	}
	return { projectId };
};

// A start or a stop without notes sends none, as before notes existed. A stop sends empty notes when they were removed.
const notesFieldOf = (description?: string): { description?: string } => {
	if (description === undefined) {
		return {};
	}
	return { description };
};

// A reason travels only when one was typed: Gauzy keeps none that is empty.
const reasonFieldOf = (reason?: string): { reason?: string } => {
	const typedReason = reason?.trim();
	if (!typedReason) {
		return {};
	}
	return { reason: typedReason };
};

class TimerService extends APIService {
	// Last time-slot sync, tied to the time log (timer run) it was measured for.
	private lastTimeSlotSync: { at: number; timeLogId?: string } | null = null;

	getTimerStatus = async (options?: ScopedReadOptions) => {
		const tenantId = options?.scope.tenantId ?? this.tenantId;
		const organizationId = options?.scope.organizationId ?? this.organizationId;
		const params = qs.stringify({ tenantId, organizationId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status?${params}&${getTodayRangeQuery()}`
			: `/timer/status?${getTodayRangeQuery()}`;

		return this.get<ITimerStatus>(endpoint, options ? scopedReadConfig(options) : undefined);
	};

	toggleTimer = async (body: Pick<IToggleTimerStatusParams, 'taskId'>) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/toggle', {
				source: ETimeLogSource.TEAMS,
				logType: 'TRACKED',
				taskId: body.taskId,
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				organizationTeamId: this.activeTeamId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/toggle?${getTodayRangeQuery()}`, body);
	};

	startTimer = async ({
		taskId,
		projectId,
		organizationTeamId,
		isBillable,
		description
	}: {
		taskId: string;
		projectId?: string | null;
		// The starting tab's own team: the team cookie is shared by every tab and may name another tab's team (#5120)
		organizationTeamId?: string | null;
		isBillable: boolean;
		description?: string;
	}) => {
		const startedAt = Date.now();
		const projectField = projectFieldOf(projectId);
		const notesField = notesFieldOf(description);
		const planDay = getTodayPlanDay();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/start', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				taskId,
				...projectField,
				logType: 'TRACKED',
				source: ETimeLogSource.TEAMS,
				tags: [],
				isBillable,
				...notesField,
				organizationTeamId: organizationTeamId || this.activeTeamId,
				planDay
			});

			return this.resetTimeSlotSync(startedAt, await this.getTimerStatus());
		}

		const api = await getFallbackAPI();
		return this.resetTimeSlotSync(
			startedAt,
			await api.post<ITimerStatus>(`/timer/start?${getTodayRangeQuery()}`, {
				taskId,
				...projectField,
				// Without it, the route takes the team cookie
				...(organizationTeamId ? { organizationTeamId } : {}),
				isBillable,
				...notesField,
				planDay
			})
		);
	};

	/**
	 * A break from the timer (Gauzy #11940): a start of type BREAK, which ends the running work entry. It is never
	 * billable and carries the task work starts again on; "back to work" is an ordinary start on that task.
	 */
	startBreak = async ({
		taskId,
		organizationTeamId
	}: {
		taskId?: string | null;
		organizationTeamId?: string | null;
	}) => {
		const taskField = taskId ? { taskId } : {};

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/start', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				...taskField,
				logType: 'BREAK',
				source: ETimeLogSource.TEAMS,
				tags: [],
				isBillable: false,
				organizationTeamId: organizationTeamId || this.activeTeamId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/start?${getTodayRangeQuery()}`, {
			...taskField,
			...(organizationTeamId ? { organizationTeamId } : {}),
			isBillable: false,
			logType: 'BREAK'
		});
	};

	private readonly resetTimeSlotSync = <R extends { data?: ITimerStatus }>(at: number, response: R): R => {
		this.lastTimeSlotSync = { at, timeLogId: response.data?.lastLog?.id };
		return response;
	};

	stopTimer = async ({
		source,
		startedAt,
		stoppedAt,
		description,
		timeLogId
	}: {
		source: ETimeLogSource;
		startedAt?: Date | string;
		stoppedAt?: Date | string;
		description?: string;
		/**
		 * The running time log the stop is for, when it must end that run and no other: Gauzy refuses the stop (409)
		 * when another log is the running one by then. A stop that names none ends whatever runs, as before.
		 */
		timeLogId?: string;
	}) => {
		const taskId = getActiveTaskIdCookie();
		const notesField = notesFieldOf(description);
		const range = { ...(startedAt ? { startedAt } : {}), ...(stoppedAt ? { stoppedAt } : {}) };
		const namedLog = timeLogId ? { timeLogId } : {};

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/stop', {
				source,
				logType: 'TRACKED',
				...(taskId ? { taskId } : {}),
				...range,
				...namedLog,
				...notesField,
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/stop?${getTodayRangeQuery()}`, {
			source,
			...range,
			...namedLog,
			...notesField
		});
	};

	/** The route that moves the running timer's start: Gauzy's in direct mode, this app's proxy otherwise. */
	private readonly timerStartMovePath = () => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return '/timesheet/timer/started-at';
		}
		return '/timer/started-at';
	};

	// Moves the start of the caller's running timer, which keeps running; the clock follows the status read after it.
	moveTimerStart = async ({
		startedAt,
		reason
	}: {
		startedAt: Date;
		reason?: string;
	}): Promise<{ data: ITimerStatus | undefined }> => {
		await this.put(this.timerStartMovePath(), { startedAt: startedAt.toISOString(), ...reasonFieldOf(reason) });

		// The move is saved: a status read that fails says nothing of it, and the clock follows the next read
		try {
			return await this.getTimerStatus();
		} catch {
			return { data: undefined };
		}
	};

	// Whether the API can move a running start. An empty body changes nothing: an API that has the route refuses it
	// (400), and one without the route answers 404.
	getTimerStartMoveSupport = async (): Promise<TimerStartMoveSupport> => {
		try {
			await this.put(this.timerStartMovePath(), {});
			return 'supported';
		} catch (error) {
			return timerStartMoveSupportOf((error as { statusCode?: number } | null)?.statusCode);
		}
	};

	/**
	 * Discards the caller's running timer: the API removes the run, its time slots and screenshots, as if it never
	 * started. `timeLogId` names the run the member saw, so a run started meanwhile elsewhere is never removed (409).
	 * Answers the timer status after the discard.
	 */
	discardTimer = async ({
		timeLogId
	}: {
		timeLogId?: string;
	}): Promise<{ data: ITimerStatus | null | undefined }> => {
		const timeLogField = timeLogId ? { timeLogId } : {};

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/timer/discard', {
				...timeLogField,
				tenantId: this.tenantId,
				organizationId: this.organizationId
			});

			// The run is discarded: a status read that fails says nothing of it, and the timer reads its status again
			try {
				return await this.getTimerStatus();
			} catch {
				return { data: undefined };
			}
		}

		const api = await getFallbackAPI();
		return api.post<ITimerStatus>(`/timer/discard?${getTodayRangeQuery()}`, timeLogField);
	};

	// /timesheet/timer/status only sees logs started today; this returns the employee's last log of any day.
	getLastTimerLog = async (employeeId: string) => {
		const params = qs.stringify({ tenantId: this.tenantId, organizationId: this.organizationId, employeeId });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status/worked?${params}`
			: '/timer/status/worked';

		return this.get<ITimerStatus[]>(endpoint);
	};

	// The last log of each employee, whatever its team. Gauzy answers with the caller's own last log only, unless the
	// caller may see their teammates' last logs.
	getLastTimerLogsOf = async (employeeIds: string[]) => {
		const query = qs.stringify({ tenantId: this.tenantId, organizationId: this.organizationId, employeeIds });
		if (GAUZY_API_BASE_SERVER_URL.value) {
			return this.get<ITimerStatus[]>(`/timesheet/timer/status/worked?${query}`);
		}

		return this.get<ITimerStatus[]>(`/timer/status/worked?${query}`);
	};

	syncTimer = async ({
		source,
		user,
		timeLogId
	}: {
		source: ETimeLogSource;
		/** The person whose timer it is: only their employee is read. */
		user?: { employee?: Pick<NonNullable<TUser['employee']>, 'id'> | null } | null;
		timeLogId?: string;
	}) => {
		// Advanced before the request so overlapping syncs never credit the same seconds twice.
		const now = Date.now();
		const previous = this.lastTimeSlotSync;
		// A reference from another run (stopped and restarted from another tab or device) would credit the gap.
		const sameRun = previous !== null && (!previous.timeLogId || !timeLogId || previous.timeLogId === timeLogId);
		const duration = toTimeSlotDuration(sameRun ? (now - previous.at) / 1000 : undefined);
		const reference = { at: now, timeLogId: timeLogId ?? previous?.timeLogId };
		this.lastTimeSlotSync = reference;
		// A failed write credited nothing: unless a newer sync took over, the previous reference comes back so the retry covers this interval.
		const restoreReference = (error: unknown): never => {
			if (this.lastTimeSlotSync === reference) {
				this.lastTimeSlotSync = previous;
			}
			throw error;
		};
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.post('/timesheet/time-slot', {
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				logType: 'TRACKED',
				source,
				employeeId: user?.employee?.id,
				duration
			}).catch(restoreReference);

			return this.getTimerStatus();
		}

		const api = await getFallbackAPI();
		return api
			.post<ITimerStatus>(`/timer/sync?${getTodayRangeQuery()}`, {
				source,
				duration
			})
			.catch(restoreReference);
	};

	/**
	 * Writes the time a run went on without a heartbeat, which the person chose to keep (#5123): from its last heartbeat
	 * (`fromMs`) to `toMs`, both on the API's clock, as the slots of the 10-minute windows it spans. An ordinary sync
	 * writes the interval since this page's previous one, which a page that just opened does not know (one interval
	 * then), and on the present. Each write moves the run's end to the present, as any heartbeat does; the next sync
	 * counts from here.
	 *
	 * Gauzy writes a slot to the employee's newest run of the source, whatever run it names: the caller reads the run
	 * again just before. The run's id goes along all the same, for a Gauzy that finds no run otherwise.
	 *
	 * Gauzy adds every slot it is sent, and has no key to tell a write sent again from a new one: a write whose answer
	 * was lost may have landed. So each slot's window is read before the slot is sent (`onSending` is told what it
	 * held), and a slot sent before without an answer (`unanswered`) is sent again only if its window does not hold
	 * it. A window written meanwhile by another device may then lose that slot, but no slot is counted twice.
	 *
	 * @param runStartedAtMs When the run started: Gauzy reads the slots of the runs started within the dates it is
	 * given only, so a window is read from there.
	 * @param unanswered The slot last sent without an answer, where the writing resumes.
	 * @param onSending Told each slot, with what its window held, before it is sent.
	 * @param onWritten Told the end of each slot once it is written: a write that fails part way resumes there.
	 */
	catchUpTimeSlots = async ({
		source,
		employeeId,
		timeLogId,
		fromMs,
		toMs,
		runStartedAtMs,
		unanswered,
		onSending,
		onWritten
	}: {
		source: ETimeLogSource;
		employeeId: string;
		timeLogId: string;
		fromMs: number;
		toMs: number;
		runStartedAtMs: number;
		unanswered?: SentTimeSlot | null;
		onSending?: (slot: SentTimeSlot) => void;
		onWritten?: (untilMs: number) => void;
	}) => {
		const isDirect = Boolean(GAUZY_API_BASE_SERVER_URL.value);
		let answered: { data?: ITimerStatus } | undefined;
		let writeFromMs = fromMs;
		if (unanswered && Date.parse(unanswered.startedAt) === fromMs) {
			const windowSeconds = await this.timeSlotWindowSeconds(employeeId, fromMs, runStartedAtMs);
			if (isSentTimeSlotHeld(unanswered, windowSeconds)) {
				onWritten?.(unanswered.untilMs);
				writeFromMs = unanswered.untilMs;
			}
		}
		// One after the other: each write moves the run's end, and the last one leaves it at the present
		for (const slot of timeSlotsBetween(writeFromMs, toMs)) {
			const windowBefore = await this.timeSlotWindowSeconds(
				employeeId,
				Date.parse(slot.startedAt),
				runStartedAtMs
			);
			onSending?.({ ...slot, windowBefore });
			if (isDirect) {
				await this.post('/timesheet/time-slot', {
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					logType: 'TRACKED',
					source,
					employeeId,
					timeLogId,
					startedAt: slot.startedAt,
					duration: slot.duration
				});
			} else {
				const api = await getFallbackAPI();
				answered = await api.post<ITimerStatus>(`/timer/sync?${getTodayRangeQuery()}`, {
					source,
					timeLogId,
					startedAt: slot.startedAt,
					duration: slot.duration
				});
			}
			onWritten?.(slot.untilMs);
		}
		this.lastTimeSlotSync = { at: Date.now(), timeLogId };
		return isDirect ? this.getTimerStatus() : answered;
	};

	/**
	 * The seconds Gauzy holds for the employee in the 10-minute window of the slot starting at `ms`. Gauzy reads the
	 * slots of the runs started within the dates it is given only (its query drops any other filter): the slots are
	 * read from the run's start, and those of the window kept.
	 */
	private readonly timeSlotWindowSeconds = async (
		employeeId: string,
		ms: number,
		runStartedAtMs: number
	): Promise<number> => {
		const windowStart = timeSlotWindowStartOf(ms);
		const windowEnd = windowStart + TIME_SLOT_WINDOW_MS;
		const from = Number.isFinite(runStartedAtMs) ? Math.min(runStartedAtMs, windowStart) : windowStart;
		const startDate = new Date(from).toISOString();
		// Gauzy reads both ends: the next window's first moment is left out
		const endDate = new Date(windowEnd - 1).toISOString();
		let slots: ITimeSlot[] | null | undefined;
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const query = qs.stringify(
				{
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					startDate,
					endDate,
					employeeIds: [employeeId]
				},
				{ arrayFormat: 'indices' }
			);
			slots = (await this.get<ITimeSlot[]>(`/timesheet/time-slot?${query}`)).data;
		} else {
			const api = await getFallbackAPI();
			slots = (await api.get<ITimeSlot[]>(`/timer/slot/window?${qs.stringify({ startDate, endDate })}`)).data;
		}
		return (slots ?? [])
			.filter((slot) => {
				const startedAt = new Date(slot.startedAt).getTime();
				return startedAt >= windowStart && startedAt < windowEnd;
			})
			.reduce((seconds, slot) => seconds + (Number(slot.duration) || 0), 0);
	};

	getTaskStatusList = async ({ employeeId }: { employeeId: string }) => {
		const params: {
			tenantId: string;
			organizationId: string;
			employeeId: string;
			organizationTeamId?: string;
		} = {
			tenantId: this.tenantId,
			organizationId: this.organizationId,
			employeeId
		};
		if (this.activeTeamId) params.organizationTeamId = this.activeTeamId;
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/timer/status?${query}`
			: `/timer/status?tenantId=${this.tenantId}&organizationId=${this.organizationId}${this.activeTeamId ? `&organizationTeamId=${this.activeTeamId}` : ''}&employeeId=${employeeId}`;

		return this.get<ITimerStatus>(endpoint, { tenantId: this.tenantId });
	};
}

export const timerService = new TimerService(GAUZY_API_BASE_SERVER_URL.value);
