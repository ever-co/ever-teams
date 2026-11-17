/* eslint-disable camelcase */
import moment from 'moment-timezone';
import {
	IApiRefusal,
	ITimer,
	ITimerDiscardParams,
	ITimerStartMoveParams,
	ITimerStatusParams,
	ITimerStatus,
	ITimerParams,
	ITimerTimeslotParams,
	TimerSource
} from '../../interfaces/ITimer';
import { serverFetch } from '../fetch';

export function getTimerStatusRequest({ tenantId, organizationId }: ITimerStatusParams, bearer_token: string) {
	// Without these bounds Gauzy counts "today" from the API server's midnight, not the user's.
	// One clock read for both bounds, so a call at midnight cannot span two days.
	const now = moment();
	const params = new URLSearchParams({
		tenantId,
		organizationId,
		todayStart: now.clone().startOf('day').toISOString(),
		todayEnd: now.clone().endOf('day').toISOString()
	});
	return serverFetch<ITimerStatus>({
		path: `/timesheet/timer/status?${params.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function startTimerRequest(params: ITimerParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/start',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function stopTimerRequest(params: ITimerParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/stop',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function toggleTimerRequest(
	{
		source = TimerSource.MOBILE,
		logType = 'TRACKED',
		taskId,
		tenantId,
		organizationId,
		organizationTeamId
	}: ITimerParams,
	bearer_token: string
) {
	return serverFetch<ITimer>({
		path: '/timesheet/timer/toggle',
		method: 'POST',
		body: {
			source,
			logType,
			taskId,
			tenantId,
			organizationId,
			...(organizationTeamId ? { organizationTeamId } : {})
		},
		bearer_token,
		tenantId
	});
}

/**
 * Moves the start of the caller's running timer, earlier or later, while it keeps running (ever-co/ever-gauzy#11941).
 * Answers the running log; a refusal names its rule in `code`, and an API without the route answers 404.
 */
export function moveTimerStartRequest(body: ITimerStartMoveParams, bearer_token: string, tenantId: string) {
	return serverFetch<ITimer | IApiRefusal>({
		path: '/timesheet/timer/started-at',
		method: 'PUT',
		bearer_token,
		body,
		tenantId
	});
}

/**
 * Discards the caller's running timer: the run, its time slots and screenshots are removed, as if it never started
 * (ever-co/ever-gauzy#11935). `timeLogId` names the run the person saw, so a run started meanwhile elsewhere is never
 * removed (409). Answers 204; a refusal names its rule in `code`.
 */
export function discardTimerRequest(params: ITimerDiscardParams, bearer_token: string) {
	return serverFetch<IApiRefusal | undefined>({
		path: '/timesheet/timer/discard',
		method: 'POST',
		bearer_token,
		body: params,
		tenantId: params.tenantId
	});
}

export function syncTimeSlotRequest(params: ITimerTimeslotParams, bearer_token: string) {
	return serverFetch<ITimer>({
		path: '/timesheet/time-slot',
		method: 'POST',
		body: params,
		bearer_token,
		tenantId: params.tenantId
	});
}
