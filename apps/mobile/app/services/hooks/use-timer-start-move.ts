import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../models';
import { runStartOf } from '../../helpers/timer-run-start';
import {
	TimerStartMoveAccess,
	TimerStartMoveSupport,
	timerStartMoveAccessOf,
	timerStartMoveSupportOf
} from '../../helpers/timer-start-move';
import { getTimerStatusRequest, moveTimerStartRequest } from '../client/requests/timer';
import useCurrentOrganization from '../client/queries/organization/current-organization';
import useFetchMyRolePermissions from '../client/queries/user/role-permissions';
import { IApiRefusal, ITimer, ITimerStatus } from '../interfaces/ITimer';
import { IRolePermission } from '../interfaces/IRolePermission';

/** Why a move of the start did not happen: the API's status (null when it was never reached) and its code. */
export interface ITimerStartMoveFailure {
	status: number | null;
	code?: string;
}

/** The queries that count today's time: they are read again once the start moved. */
const TIME_QUERY_KEYS = [['status-timer'], ['tasks'], ['teams']];

/** Whether the API behind the app can move a running start: asked once per workspace. */
const supportQueryKey = (tenantId: string) => ['timer-start-move-support', tenantId];

/** The names of the enabled permissions of the role. */
function enabledPermissionsOf(rows: IRolePermission[] | undefined): string[] | undefined {
	if (!rows) {
		return undefined;
	}
	return rows.filter((row) => row.enabled === true).map((row) => row.permission);
}

/** Whether an answer of the move is a refusal: it carries no running log. */
function isRunningLog(data: ITimer | IApiRefusal | undefined): data is ITimer {
	return !!data && typeof data === 'object' && 'startedAt' in data;
}

/**
 * The start of the caller's running timer (ever-co/ever-teams#5373): where it is, what its panel offers, and the move
 * itself.
 *
 * The panel offers the field as the API allows the move: an API that has the route (asked once, when `enabled`), a
 * run of a timer that is not the desktop app's, a role and an organization that allow changing tracked time, and,
 * for an earlier start, adding time by hand. Until the organization, the role's permissions and the route are known,
 * the panel shows the start alone.
 *
 * A move answered by the API replaces the timer's status, so the clock jumps at once and keeps running; the views that
 * count today's time read again. A refusal leaves the timer as it was and is thrown to the caller, which says why.
 */
export function useTimerStartMove({ enabled }: { enabled: boolean }) {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId, user },
		TimerStore: { timerStatus, setTimerStatus }
	} = useStores();
	const [saving, setSaving] = useState(false);

	const running = timerStatus?.running === true;
	const runningLog = timerStatus?.lastLog;
	const runStart = runStartOf(timerStatus);

	const organizationQuery = useCurrentOrganization({
		authToken: authToken ?? '',
		tenantId,
		organizationId,
		enabled: running
	});
	const permissionsQuery = useFetchMyRolePermissions({
		authToken: authToken ?? '',
		tenantId,
		userId: user?.id,
		roleId: user?.roleId
	});
	const supportQuery = useQuery({
		queryKey: supportQueryKey(tenantId),
		queryFn: async (): Promise<TimerStartMoveSupport> => {
			try {
				// An empty body changes nothing: an API that has the route refuses it (400), one without it answers 404
				const { response } = await moveTimerStartRequest({} as never, authToken ?? '', tenantId);
				return timerStartMoveSupportOf(response.status);
			} catch {
				// Not reached: the field is offered, and the save says what went wrong
				return 'supported';
			}
		},
		enabled: enabled && !!authToken && !!tenantId,
		staleTime: Infinity,
		retry: false
	});

	const organizationSettled = organizationQuery.data !== undefined || organizationQuery.isError;
	const permissions = enabledPermissionsOf(permissionsQuery.data);
	const permissionsSettled = permissions !== undefined || permissionsQuery.isError;
	const rulesKnown = organizationSettled && permissionsSettled;
	let support: TimerStartMoveSupport = supportQuery.data ?? 'checking';
	if (!rulesKnown) {
		support = 'checking';
	}

	const access: TimerStartMoveAccess = timerStartMoveAccessOf({
		source: runningLog?.source,
		support,
		permissions: permissions ?? [],
		organization: organizationQuery.data ?? null
	});

	const readAgain = useCallback(() => {
		for (const queryKey of TIME_QUERY_KEYS) {
			void queryClient.invalidateQueries({ queryKey });
		}
	}, [queryClient]);

	/** The status after the move: read again, or else the one the timer shows with the run the API answered. */
	const statusAfterMove = useCallback(
		async (movedLog: ITimer): Promise<ITimerStatus> => {
			try {
				const { data, response } = await getTimerStatusRequest({ tenantId, organizationId }, authToken ?? '');
				if (response.ok && data) {
					return data;
				}
			} catch {
				// The move is saved: the clock follows the run the API answered until the next status read
			}
			return { ...timerStatus, running: true, lastLog: movedLog };
		},
		[authToken, organizationId, tenantId, timerStatus]
	);

	const moveStart = useCallback(
		async ({ startedAt, reason }: { startedAt: Date; reason?: string }): Promise<void> => {
			setSaving(true);
			try {
				const trimmedReason = reason?.trim();
				const reasonField = trimmedReason ? { reason: trimmedReason } : {};
				let answer: Awaited<ReturnType<typeof moveTimerStartRequest>>;
				try {
					answer = await moveTimerStartRequest(
						{ startedAt: startedAt.toISOString(), ...reasonField },
						authToken ?? '',
						tenantId
					);
				} catch {
					const offline: ITimerStartMoveFailure = { status: null };
					throw offline;
				}
				const { data, response } = answer;
				if (!response.ok || !isRunningLog(data)) {
					const refusal = (data ?? {}) as IApiRefusal;
					if (response.status === 404) {
						queryClient.setQueryData(supportQueryKey(tenantId), 'unsupported');
					}
					const failure: ITimerStartMoveFailure = { status: response.status, code: refusal.code };
					throw failure;
				}
				setTimerStatus(await statusAfterMove(data));
				readAgain();
			} finally {
				setSaving(false);
			}
		},
		[authToken, queryClient, readAgain, setTimerStatus, statusAfterMove, tenantId]
	);

	return { running, runStart, source: runningLog?.source, access, saving, moveStart };
}
