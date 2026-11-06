import { queryKeys } from '@/core/query/keys';
import { taskEstimationsService } from '@/core/services/client/api/tasks/task-estimations.service';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { useConditionalUpdateEffect } from '../common';
import { detailedTaskState } from '@/core/stores';
import { useAtom } from 'jotai';
import { TCreateTaskEstimation, TTaskEstimation } from '@/core/types/schemas/task/task-estimation.schema';
export function useTaskEstimations() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);

	const detailedTaskQueryData = queryClient.getQueryData(queryKeys.tasks.detail(detailedTask?.id)) as TTask;

	const addTaskEstimationMutation = useMutation({
		mutationFn: (data: TCreateTaskEstimation) => {
			return taskEstimationsService.addTaskEstimation(data);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.tasks.detail(data.taskId), (oldData: TTask) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					estimations: [...(oldData.estimations || []), data]
				};
			});
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ESTIMATE_ADD_FAILED'), { description: t(reasonKey) });
		}
	});

	const editTaskEstimationMutation = useMutation({
		mutationFn: (data: TTaskEstimation) => {
			return taskEstimationsService.editTaskEstimation(data);
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.tasks.detail(data.taskId), (oldData: TTask) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					estimations: oldData.estimations?.map((estimation) =>
						estimation.id === data.id ? data : estimation
					)
				};
			});
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ESTIMATE_UPDATE_FAILED'), { description: t(reasonKey) });
		}
	});

	const deleteTaskEstimationMutation = useMutation({
		mutationFn: ({ estimationId }: { estimationId: string; taskId: string }) => {
			return taskEstimationsService.deleteTaskEstimation(estimationId);
		},
		onSuccess: (data, { estimationId, taskId }) => {
			queryClient.setQueryData(queryKeys.tasks.detail(taskId), (oldData: TTask) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					estimations: oldData.estimations?.filter((estimation) => estimation.id !== estimationId)
				};
			});
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ESTIMATE_DELETE_FAILED'), { description: t(reasonKey) });
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (detailedTaskQueryData) {
				setDetailedTask(detailedTaskQueryData);
			}
		},
		[detailedTaskQueryData],
		Boolean(detailedTaskQueryData)
	);

	return {
		addTaskEstimationMutation,
		addTaskEstimationLoading: addTaskEstimationMutation.isPending,
		editTaskEstimationMutation,
		editTaskEstimationLoading: editTaskEstimationMutation.isPending,
		deleteTaskEstimationMutation,
		deleteTaskEstimationLoading: deleteTaskEstimationMutation.isPending
	};
}
