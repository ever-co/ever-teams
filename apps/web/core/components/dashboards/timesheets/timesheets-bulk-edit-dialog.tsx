'use client';

import type { FormEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
	Modal,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components/common/modal';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { useTimesheetBulkEdit } from '@/core/hooks/dashboards/timesheets/use-timesheet-bulk-edit';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { BulkEditResult } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { TimesheetsBulkEditFields } from './timesheets-bulk-edit-fields';
import { TimesheetsBulkEditPreview, TimesheetsBulkEditReport } from './timesheets-bulk-edit-summary';

export interface TimesheetsBulkEditDialogProps {
	isOpen: boolean;
	closeModal: () => void;
	/** The entries ticked when the dialog opened. */
	logs: ReadonlyArray<ITimeLog>;
	permissions: TimesheetPermissions;
	onFinished: (result: BulkEditResult) => void;
}

/**
 * Changes the project, the task or the billable state of every ticked entry at once. It is drawn as the single Edit
 * dialog is, and ends on its report when a run leaves entries as they were.
 */
export function TimesheetsBulkEditDialog({
	isOpen,
	closeModal,
	logs,
	permissions,
	onFinished
}: Readonly<TimesheetsBulkEditDialogProps>) {
	const t = useTranslations();
	const edit = useTimesheetBulkEdit({ logs, permissions, onFinished, onClose: closeModal });
	const { isRunning, result } = edit;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void edit.submit();
	};

	let description: string | undefined = t('dashboard.timesheets.BULK_EDIT.DESCRIPTION');
	let body: ReactNode = (
		<form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
			<TimesheetsBulkEditFields fields={edit.fields} isDisabled={isRunning} />
			<TimesheetsBulkEditPreview
				hasChoice={edit.hasChoice}
				saveCount={edit.saveCount}
				leftOutLines={edit.leftOutLines}
				progress={edit.progress}
			/>
			<div className={modalFooterClass}>
				<Button
					type="button"
					variant="ghost"
					size="default"
					onClick={closeModal}
					disabled={isRunning}
					className={modalSecondaryActionClass}
				>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="default" disabled={!edit.canSubmit} className={modalPrimaryActionClass}>
					{isRunning && <Spinner className="size-4 animate-spin" />}
					{t('dashboard.timesheets.BULK_EDIT.UPDATE', { count: edit.saveCount })}
				</Button>
			</div>
		</form>
	);
	if (result) {
		description = undefined;
		body = (
			<div className="flex w-full flex-col gap-4">
				<TimesheetsBulkEditReport result={result} />
				<div className={modalFooterClass}>
					<Button type="button" size="default" onClick={closeModal} className={modalPrimaryActionClass}>
						{t('common.CLOSE')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			showCloseIcon={!isRunning}
			title={t('dashboard.timesheets.BULK_EDIT.TITLE', { count: logs.length })}
			description={description}
			className="h-[auto] w-full justify-start md:w-40 md:min-w-[28rem]"
		>
			{body}
		</Modal>
	);
}
