'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import type { TimesheetDialogsState } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import type { FixedMember } from '@/core/lib/utils/dashboards/manual-time-entry';

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

const ANY_MEMBER_KEY = 'any-member';

/**
 * The existing timesheet dialogs, each mounted once for the whole page and loaded on its first opening, so the
 * page carries none of them until one is needed.
 */
export function TimesheetsDialogs({
	dialogs,
	canAddTime,
	addTimeMember = null,
	isDeleting,
	onRejected,
	onDeleteConfirmed
}: Readonly<{
	dialogs: TimesheetDialogsState;
	canAddTime: boolean;
	addTimeMember?: FixedMember | null;
	isDeleting: boolean;
	onRejected: () => void;
	onDeleteConfirmed: () => Promise<void>;
}>) {
	const t = useTranslations();
	const hasOpenedAddTime = useHasBeenOpen(dialogs.isAddTimeOpen);
	const hasOpenedEdit = useHasBeenOpen(dialogs.isEditOpen);
	const hasOpenedReject = useHasBeenOpen(dialogs.isRejectOpen);
	const hasOpenedDelete = useHasBeenOpen(dialogs.isDeleteOpen);
	const showsAddTime = canAddTime && hasOpenedAddTime;
	// The form starts over when the member it is fixed to changes
	const addTimeFormKey = addTimeMember?.employeeId ?? ANY_MEMBER_KEY;
	const editedLog = dialogs.editedLog;
	const isBulkDelete = dialogs.deleteTarget.source === 'bulk';
	let deleteCount = 0;
	if (isBulkDelete) {
		deleteCount = dialogs.deleteTarget.logIds.length;
	}
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
			{showsAddTime && (
				<LazyAddTaskModal
					key={addTimeFormKey}
					isOpen={dialogs.isAddTimeOpen}
					closeModal={dialogs.closeAddTime}
					fixedMember={addTimeMember}
				/>
			)}
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
			{hasOpenedDelete && (
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
			)}
		</>
	);
}
