'use client';

import { DataTableTimeSheet, SelectFilter } from '../../pages/timesheet/table-time-sheet';
import { HeadTimeSheet } from '@/core/components/pages/calendar/page-component';
import { statusOptions, timesheetCalendar } from '../../../lib/helpers/helper-calendar';
import { StatusBadge } from './confirm-change-status';
import { Trash } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useModal } from '@/core/hooks';

interface ISetupTimeSheetProps {
	timesheet?: timesheetCalendar;
}

export function SetupTimeSheet({ timesheet }: ISetupTimeSheetProps) {
	const { isOpen, openModal, closeModal } = useModal();
	return (
		<div className="-mx-2 flex flex-col overflow-hidden px-2 py-8">
			<div className="flex flex-col w-full">
				<div className="h-px w-full bg-border"></div>
				<HeadTimeSheet timesheet={timesheet} closeModal={closeModal} isOpen={isOpen} openModal={openModal} />
			</div>
			<div className="flex flex-col h-[780px] rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5">
				<div className="w-full pb-3 flex items-center gap-x-4 justify-between">
					<div className="flex gap-x-4">
						<span className="text-sm font-medium">123 Logs Selected</span>
						<SelectFilter selectedStatus="Rejected" />
						<Button variant="outline" size="default" className="text-destructive-ink">
							<Trash />
							<span>Delete</span>
						</Button>
					</div>
					<div className="flex gap-x-2 h-6">
						<StatusBadge selectedStatus="77:00h" />
						{statusOptions.map((items, index) => (
							<StatusBadge key={index} selectedStatus={items.value} filterNumber={`${index + 2}`} />
						))}
					</div>
				</div>
				<DataTableTimeSheet />
			</div>
		</div>
	);
}
