'use client';

import { useMutation } from '@tanstack/react-query';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/task-status-order';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

/**
 * Hook for reordering task statuses with cache invalidation and toast notifications.
 *
 * @returns {Object} An object containing:
 * - `reOrderTaskStatus` - Async function to reorder task statuses
 * - `reOrderTaskStatusLoading` - Boolean indicating mutation pending state
 */
export function useReorderTaskStatus() {
	const t = useTranslations();
	const { invalidateTaskStatusesData, tenantId } = useInvalidateTaskStatuses();

	const reorderTaskStatusMutation = useMutation({
		mutationFn: (data: ITaskStatusOrder) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskStatusService.editTaskStatusOrder(data);
		},
		onSuccess: () => {
			invalidateTaskStatusesData();
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.STATUS_ORDER_FAILED'), { description: t(reasonKey) });
		}
	});

	return {
		reOrderTaskStatus: reorderTaskStatusMutation.mutateAsync,
		reOrderTaskStatusLoading: reorderTaskStatusMutation.isPending
	};
}

