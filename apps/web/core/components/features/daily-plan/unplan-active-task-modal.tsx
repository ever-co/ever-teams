import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import {
	APP_DIALOG_BODY,
	APP_DIALOG_FOOTER,
	AppDialog,
	AppDialogDescription
} from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { DialogTitle } from '@/core/components/common/dialog';
import { HueIconTile } from '@/core/components/common/value-glyphs';
import { TaskDaily } from '@/core/components/icons';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { cn } from '@/core/lib/helpers';
import { timerStatusState } from '@/core/stores';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

interface UnplanActiveTaskModalProps {
	open: boolean;
	closeModal: () => void;
	task: TTask;
	plan: TDailyPlan;
	/** Passed in by the parent, which already holds the timer actions, so this dialog adds no timer hook. */
	stopTimer: () => void;
}

export function UnplanActiveTaskModal(props: UnplanActiveTaskModalProps) {
	const { closeModal, task, open, plan, stopTimer } = props;
	const t = useTranslations();
	const timerStatus = useAtomValue(timerStatusState);

	const { removeTaskFromPlan, removeTaskFromPlanLoading } = useUpdateDailyPlan();

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const handleUnplanTask = useCallback(async () => {
		// NOTE: Use plan.employeeId/organizationId instead of inferring from the
		// authenticated user so unplan respects backend filters and works for
		// other employees' plans as well
		try {
			if (plan.id) {
				await removeTaskFromPlan(
					{
						taskId: task.id,
						employeeId: plan.employeeId ?? undefined,
						organizationId: plan.organizationId
					},
					plan.id
				);
			}
		} catch (error) {
			console.log(error);
		}
	}, [plan.employeeId, plan.id, plan.organizationId, removeTaskFromPlan, task.id]);

	const onYes = useCallback(async () => {
		if (timerStatus?.running) {
			stopTimer();
		}
		await handleUnplanTask();
		handleCloseModal();
	}, [handleCloseModal, handleUnplanTask, stopTimer, timerStatus?.running]);

	return (
		<AppDialog
			open={open}
			onClose={handleCloseModal}
			width="sm"
			keepOpenOnOutsideClick
			dismissible={!removeTaskFromPlanLoading}
		>
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col items-start py-5')}>
				<HueIconTile hue="destructive" className="size-9 rounded-[10px] [&_svg]:size-4.5">
					<TaskDaily />
				</HueIconTile>
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{t('modals.dailyPlan.unplanActiveTaskTitle')}
				</DialogTitle>
				<AppDialogDescription className="mt-1 text-[13px] text-muted-foreground">
					{t('modals.dailyPlan.unplanActiveTaskDescription')}
				</AppDialogDescription>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button
					type="button"
					variant="ghost"
					size="default"
					onClick={handleCloseModal}
					disabled={removeTaskFromPlanLoading}
					data-initial-focus=""
					className="ml-auto"
				>
					{t('common.NO')}
				</Button>
				<Button
					type="button"
					variant="danger"
					size="default"
					onClick={onYes}
					loading={removeTaskFromPlanLoading}
					disabled={removeTaskFromPlanLoading}
				>
					{t('common.YES')}
				</Button>
			</div>
		</AppDialog>
	);
}
