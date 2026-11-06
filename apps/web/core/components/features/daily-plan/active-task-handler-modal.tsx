'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { useTimerActions } from '@/core/hooks/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { ActiveTaskSwitchPanel } from './plan-editor/active-task-switch';

/**
 * Asks what to do with the active task before the timer starts on today's plan. Whatever the answer, closing starts
 * the timer, as the dialog always did; Escape and the overlay do nothing so the timer never starts by accident.
 */
export function ActiveTaskHandlerModal({
	open,
	closeModal,
	defaultPlannedTask
}: {
	open: boolean;
	closeModal: () => void;
	defaultPlannedTask: TTask;
}) {
	const t = useTranslations();
	const { startTimer } = useTimerActions();

	const finish = useCallback(() => {
		closeModal();
		// startTimer reports its own failure; this only keeps the rejection from going unhandled
		startTimer()?.catch(() => undefined);
	}, [closeModal, startTimer]);

	return (
		<AppDialog open={open} onClose={finish} width="sm" dismissible={false}>
			<AppDialogHeader title={t('dailyPlan.chang_active_task_popup.TITLE')} onClose={finish} />
			<ActiveTaskSwitchPanel plannedTask={defaultPlannedTask} onFinish={finish} />
		</AppDialog>
	);
}
