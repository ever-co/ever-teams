'use client';

import { useTranslations } from 'next-intl';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/core/components/common/alert-dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import type {
	TimesheetGroupChange,
	TimesheetGroupChangeState
} from '@/core/hooks/dashboards/timesheets/use-timesheet-group-change';
import { STATUS_LABEL_KEYS } from './timesheet-status';

function titleOf(change: TimesheetGroupChange, t: ReturnType<typeof useTranslations>) {
	const count = change.group.logs.length;
	if (change.kind === 'status') {
		const status = t(STATUS_LABEL_KEYS[change.status]);
		return t('dashboard.timesheets.SIMILAR.CONFIRM_STATUS', { count, status });
	}
	if (change.isBillable) {
		return t('dashboard.timesheets.SIMILAR.CONFIRM_BILLABLE', { count });
	}
	return t('dashboard.timesheets.SIMILAR.CONFIRM_NOT_BILLABLE', { count });
}

/**
 * The confirmation of a change of billable state or of status for every entry of a group: how many entries change,
 * on which task, and for a status that Gauzy changes whole timesheets. It stays open while the entries are written.
 */
export function TimesheetsGroupChangeDialog({ state }: Readonly<{ state: TimesheetGroupChangeState }>) {
	const t = useTranslations();
	const { change, isOpen, isSaving, confirm, close } = state;
	if (!change) {
		return null;
	}
	const taskName = change.group.logs[0]?.task?.title ?? t('dashboard.timesheets.NO_TASK');
	const isStatusChange = change.kind === 'status';
	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					close();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{titleOf(change, t)}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('dashboard.timesheets.SIMILAR.CONFIRM_SCOPE', { task: taskName })}
					</AlertDialogDescription>
					{isStatusChange && (
						<p className="text-xs text-muted-foreground text-pretty">
							{t('dashboard.timesheets.SHEET.WHOLE_TIMESHEETS')}
						</p>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSaving}>{t('common.CANCEL')}</AlertDialogCancel>
					<Button
						type="button"
						variant="default"
						size="default"
						disabled={isSaving}
						onClick={() => void confirm()}
					>
						{isSaving && <Spinner className="size-4 animate-spin" />}
						<span>{t('common.CONFIRM')}</span>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
