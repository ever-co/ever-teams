'use client';

import { useCallback, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import moment from 'moment';
import { toast } from 'sonner';
import { useCreateDailyPlan } from './use-create-daily-plan';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';

type PlanDay = 'today' | 'tomorrow';

const DAY_OFFSET: Record<PlanDay, number> = { today: 0, tomorrow: 1 };

const SUCCESS_MESSAGE_KEY = {
	today: 'task.toastMessages.TASK_PLANNED_FOR_TODAY',
	tomorrow: 'task.toastMessages.TASK_PLANNED_FOR_TOMORROW'
} as const;

const SUCCESS_TOAST_ID: Record<PlanDay, string> = {
	today: 'task-planned-for-today',
	tomorrow: 'task-planned-for-tomorrow'
};

/**
 * Adds a task to an employee's plan of today or tomorrow, with the toasts every plan action shows. Shared by the
 * task card's plan buttons and the Kanban card menu.
 */
export function usePlanTaskForDay() {
	const t = useTranslations();
	const [isPending, startTransition] = useTransition();
	const { createDailyPlan, createDailyPlanLoading } = useCreateDailyPlan();
	const { data: user } = useUserQuery();
	const tenantId = user?.tenantId ?? '';
	const organizationId = user?.employee?.organizationId;

	const planTaskForDay = useCallback(
		(day: PlanDay, taskId: string, employeeId: string | undefined, onPlanned?: () => void) => {
			startTransition(async () => {
				try {
					const date = moment().add(DAY_OFFSET[day], 'day').format('YYYY-MM-DD');
					await createDailyPlan({
						workTimePlanned: 0,
						taskId,
						date,
						status: EDailyPlanStatus.OPEN,
						tenantId,
						employeeId,
						organizationId
					});
					toast.success(t(SUCCESS_MESSAGE_KEY[day]), { id: SUCCESS_TOAST_ID[day] });
					onPlanned?.();
				} catch (error) {
					// useCreateDailyPlan already told the user
					console.error('Plan creation error:', error);
				}
			});
		},
		[createDailyPlan, organizationId, t, tenantId]
	);

	const isPlanning = isPending || createDailyPlanLoading;

	return { planTaskForDay, isPlanning, createDailyPlanLoading };
}
