'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { dailyPlanService } from '@/core/services/client/api';
import { TCreateDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { activeTeamState } from '@/core/stores';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { ERROR_REASON_KEYS, errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { useDailyPlanInvalidation } from './use-daily-plan-invalidation';
import { useTrackPlanAddition } from './use-pending-plan-additions';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook for creating daily plans.
 * Handles CREATE operations only, following Single Responsibility Principle.
 * It is the one place that reports a failed creation: its callers stay silent.
 *
 * @returns Object containing create mutation and loading state
 */
export function useCreateDailyPlan() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { invalidateDailyPlanData } = useDailyPlanInvalidation();
	const trackPlanAddition = useTrackPlanAddition();

	const createDailyplanMutation = useMutation({
		mutationFn: async (data: TCreateDailyPlan) => {
			const res = await dailyPlanService.createDailyPlan(data);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.plans.CREATE_FAILED'), { description: t(reasonKey) });
			logErrorInDev('Failed to create daily plan', error);
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const createDailyplanMutateAsync = createDailyplanMutation.mutateAsync;
	const createDailyPlan = useCallback(
		async (data: TCreateDailyPlan) => {
			if (user?.tenantId) {
				const create = () => createDailyplanMutateAsync({ ...data, organizationTeamId: activeTeam?.id });
				const taskId = data.taskId;
				if (!taskId) {
					return await create();
				}
				// Gauzy adds the task to the day's plan when there is one, so the day tells which plan it joins
				const target = { taskId, day: getDailyPlanDay(data.date), employeeId: data.employeeId };
				return await trackPlanAddition(target, create);
			} else {
				const reasonKey = ERROR_REASON_KEYS.unknown as DottedLanguageObjectStringPaths;
				toast.error(t('toasts.plans.CREATE_FAILED'), { description: t(reasonKey) });
				return Promise.reject(new Error('Missing tenantId'));
			}
		},
		[createDailyplanMutateAsync, user?.tenantId, activeTeam?.id, t, trackPlanAddition]
	);

	return {
		createDailyPlan,
		createDailyPlanLoading: createDailyplanMutation.isPending,
		invalidateDailyPlanData
	};
}
