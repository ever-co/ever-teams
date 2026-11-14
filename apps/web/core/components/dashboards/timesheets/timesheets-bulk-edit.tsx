'use client';

import dynamic from 'next/dynamic';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import type { BulkEditDialogState } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-dialog';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { BulkEditResult } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';

const LazyBulkEditDialog = dynamic(
	() => import('./timesheets-bulk-edit-dialog').then((module) => module.TimesheetsBulkEditDialog),
	{ ssr: false }
);

/**
 * The bulk edit dialog of the selection bar, loaded on its first opening as the page's other dialogs are. Every
 * opening is a new dialog, so its fields never start on what the previous one held.
 */
export function TimesheetsBulkEdit({
	dialog,
	permissions,
	onFinished
}: Readonly<{
	dialog: BulkEditDialogState;
	permissions: TimesheetPermissions;
	onFinished: (result: BulkEditResult) => void;
}>) {
	const hasOpened = useHasBeenOpen(dialog.isOpen);
	if (!hasOpened) {
		return null;
	}
	return (
		<LazyBulkEditDialog
			key={dialog.opening}
			isOpen={dialog.isOpen}
			closeModal={dialog.close}
			logs={dialog.logs}
			permissions={permissions}
			onFinished={onFinished}
		/>
	);
}
