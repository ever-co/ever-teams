'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { dailyPlanService } from '@/core/services/client/api';
import { TCreateDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { activeTeamState } from '@/core/stores';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { useDailyPlanInvalidation } from './use-daily-plan-invalidation';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook for creating daily plans.
 * Handles CREATE operations only, following Single Responsibility Principle.
 *
 * @returns Object containing create mutation and loading state
 */
export function useCreateDailyPlan() {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { invalidateDailyPlanData } = useDailyPlanInvalidation();

	const createDailyplanMutation = useMutation({
		mutationFn: async (data: TCreateDailyPlan) => {
			const res = await dailyPlanService.createDailyPlan(data);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		},
		onError: (error) => {
			toast.error('Failed to create daily plan', {
				description: getErrorMessage(error, 'Failed to create daily plan')
			});
			logErrorInDev('Failed to create daily plan', error);
		}
	});

	const createDailyPlan = useCallback(
		async (data: TCreateDailyPlan) => {
			if (user?.tenantId) {
				return await createDailyplanMutation.mutateAsync({ ...data, organizationTeamId: activeTeam?.id });
			} else {
				toast.warning('Cannot create daily plan: Missing tenantId', {
					description: 'Missing tenantId'
				});
				return Promise.reject(new Error('Missing tenantId'));
			}
		},
		[createDailyplanMutation, user?.tenantId, activeTeam?.id]
	);

	return {
		createDailyPlan,
		createDailyPlanLoading: createDailyplanMutation.isPending,
		invalidateDailyPlanData
	};
}
