'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { queryKeys } from '@/core/query/keys';
import { tasksByTeamState } from '@/core/stores';
import { pendingPlanAdditionsState, type PendingPlanAddition } from '@/core/stores/daily-plan/pending-plan-additions';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

/** A read that never settles must not keep a skeleton on screen. */
const READ_WAIT_LIMIT_MS = 15000;

const NO_ADDITIONS: PendingPlanAddition[] = [];

interface PlanAdditionTarget {
	taskId: string;
	planId?: string | null;
	day?: string | null;
	employeeId?: string | null;
}

let additionCount = 0;

function nextAdditionKey() {
	additionCount += 1;
	return `plan-addition-${additionCount}`;
}

function plansIn(data: unknown): TDailyPlan[] {
	if (Array.isArray(data)) {
		return data as TDailyPlan[];
	}
	const items = (data as { items?: unknown } | undefined)?.items;
	if (Array.isArray(items)) {
		return items as TDailyPlan[];
	}
	return [];
}

function cachedPlanOf(queryClient: QueryClient, planId: string) {
	for (const [, data] of queryClient.getQueriesData({ queryKey: queryKeys.dailyPlans.all })) {
		const plan = plansIn(data).find((candidate) => candidate.id === planId);
		if (plan) {
			return plan;
		}
	}
	return null;
}

function isReadingPlans(queryClient: QueryClient) {
	return queryClient.isFetching({ queryKey: queryKeys.dailyPlans.all }) > 0;
}

/** Resolves once the plan reads the mutation started have landed, so the task shows in the plan the moment it leaves. */
function waitForDailyPlanReads(queryClient: QueryClient) {
	return new Promise<void>((resolve) => {
		if (!isReadingPlans(queryClient)) {
			resolve();
			return;
		}
		let isDone = false;
		const finish = () => {
			if (isDone) {
				return;
			}
			isDone = true;
			unsubscribe();
			clearTimeout(timer);
			resolve();
		};
		const timer = setTimeout(finish, READ_WAIT_LIMIT_MS);
		const unsubscribe = queryClient.getQueryCache().subscribe(() => {
			if (!isReadingPlans(queryClient)) {
				finish();
			}
		});
	});
}

/** The id of the plan a creating request answered, when it answered one (`POST /daily-plan` answers the plan). */
export function createdPlanIdOf(result: unknown): string | null {
	const id = (result as { id?: unknown } | null | undefined)?.id;
	return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Shows a task as joining its plan from the request until the plans read after it have landed. */
export function useTrackPlanAddition() {
	const store = useStore();
	const setAdditions = useSetAtom(pendingPlanAdditionsState);
	const queryClient = useQueryClient();

	return useCallback(
		async <T>(target: PlanAdditionTarget, run: () => Promise<T>) => {
			const planId = target.planId ?? null;
			let plan: TDailyPlan | null = null;
			if (planId) {
				plan = cachedPlanOf(queryClient, planId);
			}
			let day = target.day ?? null;
			if (!day && plan) {
				day = getDailyPlanDay(plan.date);
			}
			const task = store.get(tasksByTeamState).find((teamTask) => teamTask.id === target.taskId) ?? null;
			const addition: PendingPlanAddition = {
				key: nextAdditionKey(),
				taskId: target.taskId,
				task,
				planId,
				day,
				employeeId: target.employeeId ?? plan?.employeeId ?? null
			};
			setAdditions((current) => [...current, addition]);
			try {
				const result = await run();
				// A request that created the plan answers it with its id: from here the task joins that plan by id,
				// not by day and owner.
				const createdPlanId = planId ? null : createdPlanIdOf(result);
				if (createdPlanId) {
					setAdditions((current) =>
						current.map((entry) => (entry.key === addition.key ? { ...entry, planId: createdPlanId } : entry))
					);
				}
				await waitForDailyPlanReads(queryClient);
				return result;
			} finally {
				setAdditions((current) => current.filter((entry) => entry.key !== addition.key));
			}
		},
		[queryClient, setAdditions, store]
	);
}

function isSameOwner(first: string | null | undefined, second: string | null | undefined) {
	const isUnknown = !first || !second;
	return isUnknown || first === second;
}

function isForPlan(addition: PendingPlanAddition, plan: TDailyPlan) {
	if (addition.planId) {
		return addition.planId === plan.id;
	}
	const isSameDay = addition.day === getDailyPlanDay(plan.date);
	return isSameDay && isSameOwner(addition.employeeId, plan.employeeId);
}

function isPlannedIn(addition: PendingPlanAddition, plan: TDailyPlan) {
	return (plan.tasks ?? []).some((task) => task.id === addition.taskId);
}

/** The tasks joining this plan that it does not list yet. */
export function usePendingAdditionsForPlan(plan: TDailyPlan | undefined) {
	const additions = useAtomValue(pendingPlanAdditionsState);
	return useMemo(() => {
		if (!plan) {
			return NO_ADDITIONS;
		}
		return additions.filter((addition) => isForPlan(addition, plan) && !isPlannedIn(addition, plan));
	}, [additions, plan]);
}

export interface PendingPlanDay {
	day: string;
	additions: PendingPlanAddition[];
}

function isOutsidePlans(addition: PendingPlanAddition, plans: TDailyPlan[]) {
	return !plans.some((plan) => isForPlan(addition, plan));
}

/** The days a request is creating a plan for, among the days this view shows, with the tasks that start them. */
export function usePendingPlanDays(
	plans: TDailyPlan[],
	employeeId: string | null | undefined,
	showsDay: (day: string) => boolean
) {
	const additions = useAtomValue(pendingPlanAdditionsState);
	return useMemo(() => {
		const byDay = new Map<string, PendingPlanAddition[]>();
		for (const addition of additions) {
			const day = addition.day;
			if (!day) {
				continue;
			}
			const isWanted = !addition.planId && isSameOwner(addition.employeeId, employeeId);
			const isShownDay = showsDay(day);
			const hasNoPlan = isOutsidePlans(addition, plans);
			const isNewDay = isWanted && isShownDay && hasNoPlan;
			if (!isNewDay) {
				continue;
			}
			const dayAdditions = byDay.get(day) ?? [];
			dayAdditions.push(addition);
			byDay.set(day, dayAdditions);
		}
		const days: PendingPlanDay[] = [];
		for (const [day, dayAdditions] of byDay) {
			days.push({ day, additions: dayAdditions });
		}
		days.sort((first, second) => first.day.localeCompare(second.day));
		return days;
	}, [additions, employeeId, plans, showsDay]);
}
