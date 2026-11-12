'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	type BulkEditResult,
	bulkEditPlanOf,
	bulkEditResultOf,
	hasBulkEditChoice,
	leftOutLinesOf
} from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { useBulkEditChoice } from './use-bulk-edit-choice';
import { type BulkEditProgress, useBulkEditRun } from './use-bulk-edit-run';
import { canEditLog, type TimesheetPermissions } from './use-timesheets-page';

export interface TimesheetBulkEditInput {
	/** The entries ticked when the dialog opened. */
	logs: ReadonlyArray<ITimeLog>;
	permissions: TimesheetPermissions;
	/** Called once the run is over, whatever it saved: the page releases the entries the result names. */
	onFinished: (result: BulkEditResult) => void;
	onClose: () => void;
}

/**
 * The bulk edit dialog from its opening to its report: the fields, what they would change among the ticked entries
 * and what they leave out, then the run and its result. A run that updated every entry asked closes the dialog; any
 * entry not updated keeps it open on the reasons.
 */
export function useTimesheetBulkEdit({ logs, permissions, onFinished, onClose }: TimesheetBulkEditInput) {
	const t = useTranslations();
	const fields = useBulkEditChoice();
	const { run, progress } = useBulkEditRun();
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<BulkEditResult | null>(null);
	const { choice, listedTeamId } = fields;

	const plan = useMemo(() => {
		const canEdit = (log: ITimeLog) => canEditLog(log, permissions);
		return bulkEditPlanOf(logs, choice, { listedTeamId, canEdit });
	}, [choice, listedTeamId, logs, permissions]);
	const leftOutLines = useMemo(() => leftOutLinesOf(plan.leftOut), [plan.leftOut]);
	const saveCount = plan.saves.length;
	const hasEntryToSave = saveCount > 0;

	const announce = useCallback(
		(report: BulkEditResult) => {
			const isComplete = report.notUpdatedCount === 0;
			if (isComplete) {
				toast.success(t('dashboard.timesheets.BULK_EDIT.UPDATED', { count: report.updatedCount }));
				return;
			}
			const message = t('dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY', {
				updated: report.updatedCount,
				notUpdated: report.notUpdatedCount
			});
			const hasUpdatedNothing = report.updatedCount === 0;
			if (hasUpdatedNothing) {
				toast.error(message);
				return;
			}
			toast.warning(message);
		},
		[t]
	);

	const submit = useCallback(async () => {
		if (!hasEntryToSave) {
			return;
		}
		setIsRunning(true);
		const outcomes = await run(plan.saves);
		// A second confirmation while the first run is going: that run reports for both
		if (!outcomes) {
			return;
		}
		const report = bulkEditResultOf(plan, outcomes);
		announce(report);
		onFinished(report);
		setIsRunning(false);
		const isComplete = report.notUpdatedCount === 0;
		if (isComplete) {
			onClose();
			return;
		}
		setResult(report);
	}, [announce, hasEntryToSave, onClose, onFinished, plan, run]);

	let runProgress: BulkEditProgress | null = null;
	if (isRunning) {
		runProgress = progress;
	}

	return {
		fields,
		hasChoice: hasBulkEditChoice(choice),
		saveCount,
		leftOutLines,
		isRunning,
		/** How far the run is, while it is going. */
		progress: runProgress,
		result,
		canSubmit: hasEntryToSave && !isRunning,
		submit
	};
}
