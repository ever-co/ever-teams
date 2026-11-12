'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { taskAutomationsService } from '@/core/services/client/api/task-automations';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { isTaskAutomationsEnabled } from '@/core/lib/utils/task-automations-enabled';
import { rulesInOrder, sortTaskAutomationRules } from '@/core/lib/utils/task-automations';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { userState } from '@/core/stores/user/user';
import type {
	ITaskAutomationRule,
	ITaskAutomationRuleCreateInput,
	ITaskAutomationRuleUpdateInput,
	ITaskAutomationTemplate,
	ITaskAutomationTestResult
} from '@/core/types/interfaces/common/task-automation';

/** Whose rules, in which organization; `null` before those are known. */
export interface TaskAutomationsScope {
	tenantId: string;
	organizationId: string;
	userId: string;
}

export function useTaskAutomationsScope(): TaskAutomationsScope | null {
	const user = useAtomValue(userState);
	const team = useAtomValue(activeTeamState);
	const tenantId = team?.tenantId ?? user?.tenantId ?? null;
	const organizationId = team?.organizationId ?? null;
	const userId = user?.id ?? null;
	return useMemo(() => {
		if (!tenantId || !organizationId || !userId) return null;
		return { tenantId, organizationId, userId };
	}, [organizationId, tenantId, userId]);
}

/**
 * Whether Settings → Automations can be used here:
 * - `off`: the deployment's switch is off (nothing is asked of the platform);
 * - `loading`: the platform has not answered yet;
 * - `available`: the platform serves the automations to this person;
 * - `unavailable`: the platform has no automations (404): the entry and the page hide;
 * - `forbidden`: the platform has them, this person may not manage them (403);
 * - `error`: the question failed for another reason (offline, a 5xx): the page offers a retry.
 */
export type TaskAutomationsAvailability = 'off' | 'loading' | 'available' | 'unavailable' | 'forbidden' | 'error';

/** What a failed probe says about the feature. */
export function availabilityOfError(error: unknown): Exclude<TaskAutomationsAvailability, 'off' | 'loading' | 'available'> {
	if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) return 'unavailable';
	if (errorStatusOf(error) === 404) return 'unavailable';
	if (errorStatusOf(error) === 403) return 'forbidden';
	return 'error';
}

/** Only a temporary failure is worth asking again for. */
export function shouldRetryProbe(failureCount: number, error: unknown): boolean {
	return availabilityOfError(error) === 'error' && failureCount < 2;
}

const NO_TEMPLATES: ITaskAutomationTemplate[] = [];

/**
 * The availability probe, which is also the templates' read: `GET /task-automations/templates`, once per sign-in and
 * organization. `probe` false (a person who could not see the entry anyway) asks nothing.
 */
export function useTaskAutomationsAvailability(probe = true) {
	const scope = useTaskAutomationsScope();
	const enabled = isTaskAutomationsEnabled();
	const query = useQuery({
		queryKey: queryKeys.taskAutomations.templates(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => taskAutomationsService.templates(scope!.organizationId, signal),
		enabled: enabled && probe && scope !== null,
		staleTime: 5 * 60_000,
		retry: shouldRetryProbe
	});
	let availability: TaskAutomationsAvailability;
	if (!enabled) availability = 'off';
	else if (query.isSuccess) availability = 'available';
	else if (query.isError) availability = availabilityOfError(query.error);
	else availability = 'loading';
	return { availability, templates: query.data ?? NO_TEMPLATES, retry: query.refetch };
}

const NO_RULES: ITaskAutomationRule[] = [];

/** The organization's rules, in the order the platform runs them. */
export function useTaskAutomationRules(enabled: boolean) {
	const scope = useTaskAutomationsScope();
	const query = useQuery({
		queryKey: queryKeys.taskAutomations.rules(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => taskAutomationsService.list(scope!.organizationId, signal),
		enabled: enabled && isTaskAutomationsEnabled() && scope !== null,
		staleTime: 15_000
	});
	const rules = useMemo(() => sortTaskAutomationRules(query.data ?? NO_RULES), [query.data]);
	return { rules, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

/** A rule's last runs, newest first; asked only while `ruleId` is set (the history is open). */
export function useTaskAutomationRuns(ruleId: string | null) {
	const scope = useTaskAutomationsScope();
	return useQuery({
		queryKey: queryKeys.taskAutomations.runs(scope?.tenantId, scope?.organizationId, scope?.userId, ruleId),
		queryFn: ({ signal }) => taskAutomationsService.runs(scope!.organizationId, ruleId as string, 50, signal),
		enabled: isTaskAutomationsEnabled() && scope !== null && !!ruleId,
		staleTime: 5_000
	});
}

/** The writes of this page, so a write can tell whether others are still under way. */
const WRITE_KEY = ['task-automations', 'write'] as const;

/** Where a write applies: the organization it was made in, and that organization's rules in the cache. */
interface WriteScope {
	organizationId: string;
	rulesKey: QueryKey;
}

/**
 * The writes of the page: create, edit, switch on/off and reorder (both shown at once and rolled back when the
 * platform refuses), delete, and the dry run (which writes nothing). Each answers the platform's rule, or throws.
 *
 * Each write keeps the organization and the rules' cache key it started in (`WriteScope`): one that finishes after a
 * switch of organization lands in the list it was made for, never in the new one. A refused switch puts back that
 * rule's switch alone, and a refused reorder that order alone, so a write that succeeded meanwhile keeps its result;
 * once the last write under way settles, the rules are read again.
 */
export function useTaskAutomationActions() {
	const scope = useTaskAutomationsScope();
	const queryClient = useQueryClient();
	const rulesKey = queryKeys.taskAutomations.rules(scope?.tenantId, scope?.organizationId, scope?.userId);
	const organizationId = scope?.organizationId ?? '';
	const current = (): WriteScope => ({ organizationId, rulesKey });

	const setRules = useCallback(
		(key: QueryKey, update: (rules: ITaskAutomationRule[]) => ITaskAutomationRule[]) =>
			queryClient.setQueryData<ITaskAutomationRule[]>(key, (cached) => (cached ? update(cached) : cached)),
		[queryClient]
	);
	const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: rulesKey }), [queryClient, rulesKey]);
	/** After a write: read the rules again once no other write is under way (this one still counts itself). */
	const settle = useCallback(
		(key: QueryKey) => {
			if (queryClient.isMutating({ mutationKey: WRITE_KEY }) <= 1) void queryClient.invalidateQueries({ queryKey: key });
		},
		[queryClient]
	);

	const createMutation = useMutation({
		mutationKey: WRITE_KEY,
		mutationFn: ({ write, input }: { write: WriteScope; input: ITaskAutomationRuleCreateInput }) =>
			taskAutomationsService.create(write.organizationId, input),
		onSuccess: async (created, { write }) => {
			// A read under way could answer the list from before the rule: it is dropped, and the list read again.
			await queryClient.cancelQueries({ queryKey: write.rulesKey });
			setRules(write.rulesKey, (rules) => [...rules.filter((one) => one.id !== created.id), created]);
		},
		onSettled: (_data, _error, { write }) => settle(write.rulesKey)
	});

	const updateMutation = useMutation({
		mutationKey: WRITE_KEY,
		mutationFn: ({ write, id, input }: { write: WriteScope; id: string; input: ITaskAutomationRuleUpdateInput }) =>
			taskAutomationsService.update(write.organizationId, id, input),
		onMutate: async ({ write, id, input }) => {
			// Only the switch is shown before the answer: the rest of an edit waits for what the platform kept.
			if (input.isEnabled === undefined || Object.keys(input).length !== 1) return undefined;
			await queryClient.cancelQueries({ queryKey: write.rulesKey });
			const before = queryClient.getQueryData<ITaskAutomationRule[]>(write.rulesKey)?.find((rule) => rule.id === id);
			setRules(write.rulesKey, (rules) => rules.map((rule) => (rule.id === id ? { ...rule, isEnabled: !!input.isEnabled } : rule)));
			return { wasEnabled: before?.isEnabled };
		},
		onError: (_error, { write, id, input }, context) => {
			if (context?.wasEnabled === undefined) return;
			// Only this rule's switch goes back, and only while it still shows what this write set.
			setRules(write.rulesKey, (rules) =>
				rules.map((rule) =>
					rule.id === id && rule.isEnabled === !!input.isEnabled ? { ...rule, isEnabled: !!context.wasEnabled } : rule
				)
			);
		},
		onSuccess: (updated, { write }) =>
			setRules(write.rulesKey, (rules) => rules.map((rule) => (rule.id === updated.id ? updated : rule))),
		onSettled: (_data, _error, { write }) => settle(write.rulesKey)
	});

	const reorderMutation = useMutation({
		mutationKey: WRITE_KEY,
		mutationFn: ({ write, ids }: { write: WriteScope; ids: string[] }) => taskAutomationsService.reorder(write.organizationId, ids),
		onMutate: async ({ write, ids }) => {
			await queryClient.cancelQueries({ queryKey: write.rulesKey });
			const order = queryClient.getQueryData<ITaskAutomationRule[]>(write.rulesKey)?.map((rule) => rule.id);
			setRules(write.rulesKey, (rules) => rulesInOrder(rules, ids));
			return { order };
		},
		onError: (_error, { write }, context) => {
			// The order goes back; each rule keeps what other writes made of it meanwhile.
			const order = context?.order;
			if (order) setRules(write.rulesKey, (rules) => rulesInOrder(rules, order));
		},
		// The platform's order, with each rule as the cache has it now (a switch saved meanwhile stays).
		onSuccess: (ordered, { write }) => setRules(write.rulesKey, (rules) => rulesInOrder(rules, ordered.map((rule) => rule.id))),
		onSettled: (_data, _error, { write }) => settle(write.rulesKey)
	});

	const removeMutation = useMutation({
		mutationKey: WRITE_KEY,
		mutationFn: ({ write, id }: { write: WriteScope; id: string }) => taskAutomationsService.remove(write.organizationId, id),
		onSuccess: (_result, { write, id }) => setRules(write.rulesKey, (rules) => rules.filter((rule) => rule.id !== id)),
		onSettled: (_data, _error, { write }) => settle(write.rulesKey)
	});

	const testMutation = useMutation({
		mutationFn: ({ write, id, taskId }: { write: WriteScope; id: string; taskId: string }): Promise<ITaskAutomationTestResult> =>
			taskAutomationsService.test(write.organizationId, id, taskId)
	});

	return {
		create: (input: ITaskAutomationRuleCreateInput) => createMutation.mutateAsync({ write: current(), input }),
		isCreating: createMutation.isPending,
		update: (id: string, input: ITaskAutomationRuleUpdateInput) => updateMutation.mutateAsync({ write: current(), id, input }),
		isUpdating: updateMutation.isPending,
		setEnabled: (id: string, isEnabled: boolean) => updateMutation.mutateAsync({ write: current(), id, input: { isEnabled } }),
		reorder: (ids: string[]) => reorderMutation.mutateAsync({ write: current(), ids }),
		isReordering: reorderMutation.isPending,
		remove: (id: string) => removeMutation.mutateAsync({ write: current(), id }),
		isRemoving: removeMutation.isPending,
		test: (id: string, taskId: string) => testMutation.mutateAsync({ write: current(), id, taskId }),
		isTesting: testMutation.isPending,
		invalidate
	};
}
