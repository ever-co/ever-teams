'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { OpenedScheduleGoneError, openedScheduleFateOf } from '@/core/lib/utils/invoice-schedules';
import { queryKeys } from '@/core/query/keys';
import { invoiceScheduleService } from '@/core/services/client/api/organizations/invoice-schedule.service';
import type { InvoicesScope } from '@/core/services/client/api/organizations/invoice.service';
import { shellSettledState } from '@/core/stores/common/shell';
import type {
	InvoiceScheduleInput,
	TInvoiceSchedule,
	TInvoiceScheduleRun
} from '@/core/types/schemas/organization/invoice-schedule.schema';

const NO_SCHEDULES: TInvoiceSchedule[] = [];

const NO_RUNS: TInvoiceScheduleRun[] = [];

/** The workspace the cookies name now, or null without one. */
function useWorkspace(): InvoicesScope | null {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	return useMemo(() => {
		if (!tenantId || !organizationId) {
			return null;
		}
		return { tenantId, organizationId };
	}, [organizationId, tenantId]);
}

/** An API without the billing schedules (before ever-co/ever-gauzy#11987) has no such route. */
function isMissingRoute(error: unknown): boolean {
	return errorStatusOf(error) === 404;
}

/**
 * The workspace's billing schedules, or one client's. Read in the workspace the key names, whatever another tab
 * switched the cookies to since, and once the shell has settled: nothing the shell needs waits for them, and the
 * cold-start budget counts every read that starts before it is ready (shell.ts).
 */
export function useInvoiceSchedules({
	clientId = null,
	enabled
}: Readonly<{ clientId?: string | null; enabled: boolean }>) {
	const workspace = useWorkspace();
	const shellSettled = useAtomValue(shellSettledState);
	const query = useQuery({
		queryKey: queryKeys.invoiceSchedules.list(workspace?.tenantId, workspace?.organizationId, clientId),
		queryFn: ({ signal }) =>
			invoiceScheduleService.getSchedules({ clientId, scope: workspace ?? undefined, signal }),
		enabled: enabled && !!workspace && shellSettled,
		// Once, as every read (query config), unless the route is missing: asking again would only repeat the 404
		retry: (failureCount, error) => !isMissingRoute(error) && failureCount < 1
	});
	return {
		schedules: query.data ?? NO_SCHEDULES,
		/** The workspace the schedules were read in: a change to one is made there. */
		workspace,
		/** Until the schedules are read, waiting included: nothing is known yet, so no schedule is offered to set. */
		isLoading: query.isPending,
		isError: query.isError,
		/** The API has no billing schedules: there is nothing to show, and nothing to retry. */
		isUnavailable: query.isError && isMissingRoute(query.error),
		refetch: query.refetch
	};
}

/** A client's billing schedule, or null when it has none. */
export function useClientInvoiceSchedule(clientId: string | null, { enabled }: Readonly<{ enabled: boolean }>) {
	const read = useInvoiceSchedules({ clientId, enabled: enabled && !!clientId });
	const schedule = read.schedules.find((item) => item.organizationContactId === clientId) ?? null;
	return { ...read, schedule };
}

/** A schedule's latest runs, newest first, each with the invoice it made. */
export function useInvoiceScheduleRuns(scheduleId: string | null, { enabled }: Readonly<{ enabled: boolean }>) {
	const workspace = useWorkspace();
	const query = useQuery({
		queryKey: queryKeys.invoiceSchedules.runs(workspace?.tenantId, workspace?.organizationId, scheduleId),
		queryFn: ({ signal }) =>
			invoiceScheduleService.getRuns(scheduleId as string, { scope: workspace ?? undefined, signal }),
		enabled: enabled && !!workspace && !!scheduleId
	});
	return {
		runs: query.data ?? NO_RUNS,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** What a change to a schedule says. */
export type InvoiceScheduleChange = Partial<InvoiceScheduleInput> & { paused?: boolean };

/** What a confirmed deletion did: deleted the schedule, or found it deleted already. */
export type InvoiceScheduleDeletion = 'deleted' | 'alreadyDeleted';

/**
 * Set, change, pause, resume and delete a client's billing schedule, in the workspace the schedules were read in; every
 * read of the schedules is refreshed afterwards, after a refusal too: a create refused because another tab set the
 * client's schedule meanwhile then shows that schedule, which the form opens on next time.
 */
export function useInvoiceScheduleMutations(workspace: InvoicesScope | null) {
	const queryClient = useQueryClient();
	const refresh = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.invoiceSchedules.all }),
		[queryClient]
	);
	const scope = workspace ?? undefined;

	const createMutation = useMutation({
		mutationFn: ({ clientId, input }: { clientId: string; input: InvoiceScheduleInput }) =>
			invoiceScheduleService.createSchedule(clientId, input, scope),
		onSettled: refresh
	});
	const updateMutation = useMutation({
		mutationFn: ({ scheduleId, change }: { scheduleId: string; change: InvoiceScheduleChange }) =>
			invoiceScheduleService.updateSchedule(scheduleId, change, scope),
		onSettled: refresh
	});
	const deleteMutation = useMutation({
		mutationFn: (scheduleId: string) => invoiceScheduleService.deleteSchedule(scheduleId, scope),
		onSettled: refresh
	});

	const updateScheduleById = updateMutation.mutateAsync;

	/**
	 * Saves a form's change to the schedule it opened on, and never to another: the change is sent to that schedule's
	 * id only, so a schedule that replaced it, even one set after this check, is never written. When the latest read
	 * already shows it deleted, or replaced by another (another tab deleted it and set a new one), nothing is sent
	 * and the schedules are read again before the save fails, so the section shows what is there now. An API that
	 * answers the schedule no longer exists (404) changed nothing either: that save fails as `deleted`, even when
	 * another schedule replaced it after the check, since the one it opened on was deleted all the same, and the
	 * reload shows the replacement. Either way the save fails with the reason, as an `OpenedScheduleGoneError`.
	 * While the client's schedule is not read (another tab switched the workspace and its read is still on the way,
	 * or it failed with nothing to show), nothing tells what became of it: nothing is sent, and the save fails as any
	 * failed save does, without saying the schedule was deleted.
	 */
	const updateOpenedSchedule = useCallback(
		async ({
			scheduleId,
			latest,
			change
		}: {
			/** The schedule the form opened on. */
			scheduleId: string;
			/** The client's schedule as last read, null when it has none, undefined while nothing was read. */
			latest: TInvoiceSchedule | null | undefined;
			change: InvoiceScheduleChange;
		}): Promise<TInvoiceSchedule> => {
			if (latest === undefined) {
				throw new Error('The client’s billing schedule is not read yet, so the change was not saved');
			}
			const fate = openedScheduleFateOf(scheduleId, latest);
			if (fate !== 'current') {
				await refresh();
				throw new OpenedScheduleGoneError(fate);
			}
			try {
				return await updateScheduleById({ scheduleId, change });
			} catch (error) {
				if (errorStatusOf(error) === 404) {
					throw new OpenedScheduleGoneError('deleted');
				}
				throw error;
			}
		},
		[refresh, updateScheduleById]
	);

	const deleteScheduleById = deleteMutation.mutateAsync;

	/**
	 * Deletes the schedule a confirmation opened on, and never another: the deletion is sent to that schedule's id
	 * only, so a schedule that replaced it, even one set after this check, is never deleted. When the latest read
	 * already shows it replaced by another (another tab deleted it and set a new one), nothing is sent, the schedules
	 * are read again, and the deletion fails as an `OpenedScheduleGoneError`: the section then shows the new one,
	 * which its person has not chosen to delete. When the latest read shows no schedule left, or the API answers it
	 * no longer exists (404), what its person asked is done already: `alreadyDeleted`, after the schedules are read
	 * again. While the client's schedule is not read (another tab switched the workspace and its read is still on the
	 * way, or it failed with nothing to show), nothing is sent and the deletion fails as any failed deletion does.
	 */
	const deleteOpenedSchedule = useCallback(
		async ({
			scheduleId,
			latest
		}: {
			/** The schedule the confirmation opened on. */
			scheduleId: string;
			/** The client's schedule as last read, null when it has none, undefined while nothing was read. */
			latest: TInvoiceSchedule | null | undefined;
		}): Promise<InvoiceScheduleDeletion> => {
			if (latest === undefined) {
				throw new Error('The client’s billing schedule is not read yet, so nothing was deleted');
			}
			const fate = openedScheduleFateOf(scheduleId, latest);
			if (fate !== 'current') {
				await refresh();
				if (fate === 'replaced') {
					throw new OpenedScheduleGoneError(fate);
				}
				return 'alreadyDeleted';
			}
			try {
				await deleteScheduleById(scheduleId);
				return 'deleted';
			} catch (error) {
				// The mutation read the schedules again already (onSettled), before this answer
				if (errorStatusOf(error) === 404) {
					return 'alreadyDeleted';
				}
				throw error;
			}
		},
		[deleteScheduleById, refresh]
	);

	return {
		createSchedule: createMutation.mutateAsync,
		updateSchedule: updateMutation.mutateAsync,
		updateOpenedSchedule,
		deleteSchedule: deleteMutation.mutateAsync,
		deleteOpenedSchedule,
		isSaving: createMutation.isPending || updateMutation.isPending,
		isDeleting: deleteMutation.isPending
	};
}
