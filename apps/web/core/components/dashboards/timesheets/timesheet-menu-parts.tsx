'use client';

import { useTranslations } from 'next-intl';
import {
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Check, CheckCircle2, DollarCircle, X } from '@/core/components/icons';
import { TIMESHEET_STATUS_ORDER } from '@/core/lib/utils/dashboards/timesheets';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { STATUS_LABEL_KEYS, TimesheetStatusDot } from './timesheet-status';

/** "Change status" of a row menu: every status, the current one marked. */
export function StatusSubmenu({
	status,
	onChange
}: Readonly<{ status: ETimesheetStatus | null; onChange: (status: ETimesheetStatus) => void }>) {
	const t = useTranslations();
	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<CheckCircle2 />
				<span>{t('common.CHANGE_STATUS')}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent className="min-w-44">
				{TIMESHEET_STATUS_ORDER.map((option) => (
					<DropdownMenuItem key={option} onClick={() => onChange(option)}>
						<TimesheetStatusDot status={option} />
						<span className="flex-1">{t(STATUS_LABEL_KEYS[option])}</span>
						{option === status && <SelectedMark />}
					</DropdownMenuItem>
				))}
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}

/** "Billable" of a row menu: yes or no, the current state marked. */
export function BillableSubmenu({
	isBillable,
	onChange
}: Readonly<{ isBillable: boolean; onChange: (isBillable: boolean) => void }>) {
	const t = useTranslations();
	const isNotBillable = !isBillable;
	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<DollarCircle />
				<span>{t('dashboard.timesheets.BILLABLE')}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent className="min-w-36">
				<DropdownMenuItem onClick={() => onChange(true)}>
					<Check />
					<span className="flex-1">{t('pages.timesheet.BILLABLE.YES')}</span>
					{isBillable && <SelectedMark />}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onChange(false)}>
					<X />
					<span className="flex-1">{t('pages.timesheet.BILLABLE.NO')}</span>
					{isNotBillable && <SelectedMark />}
				</DropdownMenuItem>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}
