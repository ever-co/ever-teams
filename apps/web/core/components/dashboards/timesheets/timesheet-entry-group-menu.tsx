'use client';

import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { MoreHorizontal, Trash } from '@/core/components/icons';
import type { TimesheetGroupHandlers } from '@/core/hooks/dashboards/timesheets/use-timesheet-group-change';
import { canEditLog, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { statusOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { BillableSubmenu, StatusSubmenu } from './timesheet-menu-parts';

/**
 * The menu of a group row: the status (for whoever may approve), the billable state and the delete of every entry of
 * the group, offered as each entry's own menu offers them. The delete needs every entry to be one the reader may
 * delete; editing, continuing and duplicating stay on each entry under the open group.
 */
export function TimesheetEntryGroupMenu({
	group,
	permissions,
	handlers
}: Readonly<{
	group: TimesheetEntryGroup;
	permissions: TimesheetPermissions;
	handlers: TimesheetGroupHandlers;
}>) {
	const t = useTranslations();
	const [firstLog] = group.logs;
	const status = statusOfLog(firstLog);
	const isBillable = Boolean(firstLog.isBillable);
	const canDelete = group.logs.every((log) => canEditLog(log, permissions));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('common.MORE_OPTIONS')}
					className="text-muted-foreground"
				>
					<MoreHorizontal />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				{permissions.canApprove && (
					<StatusSubmenu status={status} onChange={(option) => handlers.changeStatus(group, option)} />
				)}
				<BillableSubmenu isBillable={isBillable} onChange={(value) => handlers.setBillable(group, value)} />
				{canDelete && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={() => handlers.remove(group)}>
							<Trash />
							<span>{t('common.DELETE')}</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
