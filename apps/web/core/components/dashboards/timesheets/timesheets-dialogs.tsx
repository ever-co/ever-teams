'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import type { TimesheetDialogsState } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import type { TimeEntryDuplicateState } from '@/core/hooks/timesheet/use-time-entry-duplicate';

const LazyAddTaskModal = dynamic(
	() => import('@/core/components/features/timesheet/add-mask-modal').then((module) => module.AddTaskModal),
	{ ssr: false }
);

const LazyEditTaskModal = dynamic(
	() => import('@/core/components/features/tasks/edit-task-modal').then((module) => module.EditTaskModal),
	{ ssr: false }
);

const LazyRejectSelectedModal = dynamic(
	() =>
		import('@/core/components/features/timesheet/reject-selected-modal').then(
			(module) => module.RejectSelectedModal
		),
	{ ssr: false }
);

const LazyAlertConfirmationModal = dynamic(
	() => import('@/core/components/common/alert-dialog-confirmation').then((module) => module.AlertConfirmationModal),
	{ ssr: false }
);

/** The reject dialog of the old table caps the reason at 120 characters; Gauzy stores it on the timesheet. */
const REASON_MAX_LENGTH = 120;

/** The confirmation before logs are deleted, on its own for a page that opens none of the other dialogs. */
export function TimesheetsDeleteDialog({
	dialogs,
	isDeleting,
	onDeleteConfirmed
}: Readonly<{
	dialogs: Pick<TimesheetDialogsState, 'isDeleteOpen' | 'closeDelete' | 'deleteTarget'>;
	isDeleting: boolean;
	onDeleteConfirmed: () => Promise<void>;
}>) {
	const t = useTranslations();
	const hasOpenedDelete = useHasBeenOpen(dialogs.isDeleteOpen);
	const isBulkDelete = dialogs.deleteTarget.source === 'bulk';
	let deleteCount = 0;
	if (isBulkDelete) {
		deleteCount = dialogs.deleteTarget.logIds.length;
	}
	if (!hasOpenedDelete) {
		return null;
	}
	return (
		<LazyAlertConfirmationModal
			open={dialogs.isDeleteOpen}
			close={dialogs.closeDelete}
			title={t('common.DELETE_CONFIRMATION')}
			description={t('common.IRREVERSIBLE_ACTION_WARNING')}
			confirmText={t('common.DELETE')}
			cancelText={t('common.CANCEL')}
			loading={isDeleting}
			onAction={onDeleteConfirmed}
			countID={deleteCount}
		/>
	);
}

/**
 * A copied entry opens the Add time entry dialog on its own instance, keyed by the copy: the form of the page's
 * Add time keeps what was typed in it, and a second copy never opens on the fields of the first.
 */
function DuplicateDialog({ duplicate }: Readonly<{ duplicate: TimeEntryDuplicateState }>) {
	const hasOpened = useHasBeenOpen(duplicate.isOpen);
	const draft = duplicate.draft;
	if (!hasOpened || !draft) {
		return null;
	}
	return (
		<LazyAddTaskModal
			key={draft.id}
			isOpen={duplicate.isOpen}
			closeModal={duplicate.close}
			prefill={draft}
			checkBeforeSave={duplicate.checkBeforeSave}
		/>
	);
}

/**
 * The existing timesheet dialogs, each mounted once for the whole page and loaded on its first opening, so the
 * page carries none of them until one is needed.
 */
export function TimesheetsDialogs({
	dialogs,
	canAddTime,
	isDeleting,
	onRejected,
	onDeleteConfirmed,
	duplicate
}: Readonly<{
	dialogs: TimesheetDialogsState;
	canAddTime: boolean;
	isDeleting: boolean;
	onRejected: () => void;
	onDeleteConfirmed: () => Promise<void>;
	duplicate?: TimeEntryDuplicateState;
}>) {
	const hasOpenedAddTime = useHasBeenOpen(dialogs.isAddTimeOpen);
	const hasOpenedEdit = useHasBeenOpen(dialogs.isEditOpen);
	const hasOpenedReject = useHasBeenOpen(dialogs.isRejectOpen);
	const showsAddTime = canAddTime && hasOpenedAddTime;
	const editedLog = dialogs.editedLog;
	let editDialog: ReactNode = null;
	if (hasOpenedEdit && editedLog) {
		editDialog = (
			<LazyEditTaskModal
				key={editedLog.id}
				isOpen={dialogs.isEditOpen}
				closeModal={dialogs.closeEdit}
				timeLogData={editedLog}
			/>
		);
	}

	return (
		<>
			{showsAddTime && <LazyAddTaskModal isOpen={dialogs.isAddTimeOpen} closeModal={dialogs.closeAddTime} />}
			{duplicate && <DuplicateDialog duplicate={duplicate} />}
			{editDialog}
			{hasOpenedReject && (
				<LazyRejectSelectedModal
					isOpen={dialogs.isRejectOpen}
					closeModal={dialogs.closeReject}
					selectTimesheetId={dialogs.rejectTarget.timesheetIds}
					onReject={onRejected}
					maxReasonLength={REASON_MAX_LENGTH}
					minReasonLength={0}
				/>
			)}
			<TimesheetsDeleteDialog dialogs={dialogs} isDeleting={isDeleting} onDeleteConfirmed={onDeleteConfirmed} />
		</>
	);
}
