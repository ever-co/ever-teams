'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { invoiceScheduleService } from '@/core/services/client/api/organizations/invoice-schedule.service';
import type { InvoicesScope } from '@/core/services/client/api/organizations/invoice.service';
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

/**
 * The workspace's billing schedules, or one client's. Read in the workspace the key names, whatever another tab
 * switched the cookies to since.
 */
export function useInvoiceSchedules({
	clientId = null,
	enabled
}: Readonly<{ clientId?: string | null; enabled: boolean }>) {
	const workspace = useWorkspace();
	const query = useQuery({
		queryKey: queryKeys.invoiceSchedules.list(workspace?.tenantId, workspace?.organizationId, clientId),
		queryFn: ({ signal }) =>
			invoiceScheduleService.getSchedules({ clientId, scope: workspace ?? undefined, signal }),
		enabled: enabled && !!workspace
	});
	return {
		schedules: query.data ?? NO_SCHEDULES,
		/** The workspace the schedules were read in: a change to one is made there. */
		workspace,
		isLoading: query.isLoading,
		isError: query.isError,
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

/**
 * Set, change, pause, resume and delete a client's billing schedule, in the workspace the schedules were read in; every
 * read of the schedules is refreshed afterwards.
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
		// A failed create is read again too: when another tab set the client's schedule meanwhile, the page then shows that
		// one, and the dialog opens on it instead of a second create
		onSettled: refresh
	});
	const updateMutation = useMutation({
		mutationFn: ({ scheduleId, change }: { scheduleId: string; change: InvoiceScheduleChange }) =>
			invoiceScheduleService.updateSchedule(scheduleId, change, scope),
		onSuccess: refresh
	});
	const deleteMutation = useMutation({
		mutationFn: (scheduleId: string) => invoiceScheduleService.deleteSchedule(scheduleId, scope),
		onSuccess: refresh
	});

	return {
		createSchedule: createMutation.mutateAsync,
		updateSchedule: updateMutation.mutateAsync,
		deleteSchedule: deleteMutation.mutateAsync,
		isSaving: createMutation.isPending || updateMutation.isPending,
		isDeleting: deleteMutation.isPending
	};
}
