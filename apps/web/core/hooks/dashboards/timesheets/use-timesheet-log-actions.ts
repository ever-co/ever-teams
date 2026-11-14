'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { useDeleteTimesheet } from '@/core/hooks/timesheet/use-delete-timesheet';
import { useUpdateTimeLogMutation } from '@/core/hooks/timesheet/use-update-time-log';
import { chunksOf, DELETE_BATCH_SIZE, timesheetIdsOf } from '@/core/lib/utils/dashboards/timesheets';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * The writes of the Timesheets page, on the existing timesheet mutations (they refresh the timesheet, time log and
 * dashboard caches). A failure is reported by the app's global mutation toast; these only say when a quiet success
 * would leave the reader unsure, as the old table did.
 */
export function useTimesheetLogActions() {
	const t = useTranslations();
	const { updateTimesheetStatus, loadingUpdateTimesheetStatus } = useUpdateTimesheet();
	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useDeleteTimesheet();
	const { mutateAsync: updateTimeLog } = useUpdateTimeLogMutation();

	const changeStatus = useCallback(
		async (logs: ReadonlyArray<ITimeLog>, status: ETimesheetStatus, announces: boolean) => {
			const ids = timesheetIdsOf(logs);
			if (ids.length === 0) {
				return false;
			}
			try {
				await updateTimesheetStatus({ status, ids });
			} catch (error) {
				console.error('Failed to change the timesheet status', error);
				return false;
			}
			if (announces) {
				toast.success(t('toasts.time.STATUS_CHANGED'));
			}
			return true;
		},
		[t, updateTimesheetStatus]
	);

	const writeBillable = useCallback(
		async (log: ITimeLog, isBillable: boolean) => {
			try {
				await updateTimeLog({
					timeLogId: log.id,
					startedAt: log.startedAt,
					stoppedAt: log.stoppedAt,
					employeeId: log.employeeId,
					isBillable
				});
				return true;
			} catch (error) {
				console.error('Failed to change the billable state', error);
				return false;
			}
		},
		[updateTimeLog]
	);

	const setBillable = useCallback(
		async (log: ITimeLog, isBillable: boolean) => {
			await writeBillable(log, isBillable);
		},
		[writeBillable]
	);

	/** The billable state of several entries, written one after the other as from each row; answers how many changed. */
	const setBillableOf = useCallback(
		async (logs: ReadonlyArray<ITimeLog>, isBillable: boolean) => {
			let changedCount = 0;
			for (const log of logs) {
				const isChanged = await writeBillable(log, isBillable);
				if (isChanged) {
					changedCount += 1;
				}
			}
			return changedCount;
		},
		[writeBillable]
	);

	const deleteLogs = useCallback(
		async (logIds: ReadonlyArray<string>, announces: boolean) => {
			const batches = chunksOf(logIds, DELETE_BATCH_SIZE);
			try {
				for (const batch of batches) {
					await deleteTaskTimesheet({ logIds: batch });
				}
			} catch (error) {
				console.error('Failed to delete the time logs', error);
				return false;
			}
			if (announces) {
				toast.success(t('toasts.time.LOG_DELETED'));
			}
			return true;
		},
		[deleteTaskTimesheet, t]
	);

	return {
		changeStatus,
		setBillable,
		setBillableOf,
		deleteLogs,
		isChangingStatus: loadingUpdateTimesheetStatus,
		isDeleting: loadingDeleteTimesheet
	};
}
