'use client';

import { DataTableTimeSheet, SelectFilter } from './table-time-sheet';
import { HeadTimeSheet } from '@app/[locale]/calendar/component';
import { statusOptions, timesheetCalendar } from './helper-calendar';
import { StatusBadge } from './confirm-change-status';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useModal } from '@app/hooks';

interface ISetupTimeSheetProps {
	timesheet?: timesheetCalendar;
}

export function SetupTimeSheet({ timesheet }: ISetupTimeSheetProps) {
	const { isOpen, openModal, closeModal } = useModal();
	return (
		<div className="flex flex-col overflow-hidden py-[32px]">
			<div className="flex flex-col w-full">
				<div className="border border-gray-100 dark:border-gray-700 w-full"></div>
				<HeadTimeSheet timesheet={timesheet} closeModal={closeModal} isOpen={isOpen} openModal={openModal} />
			</div>
			<div className="flex flex-col h-[780px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark--theme-light p-4 shadow-lg shadow-gray-100  dark:shadow-gray-700">
				<div className="w-full pb-3 flex items-center gap-x-4 justify-between">
					<div className="flex gap-x-4">
						<span className="font-medium">123 Logs Selected</span>
						<SelectFilter selectedStatus="Rejected" />
						<button className="border flex items-center gap-2 border-gray-200 dark:border-gray-700 text-red-500 h-8 px-2 rounded-md">
							{/* @ts-ignore */}
							<RiDeleteBinLine />
							<span className="!font-normal text-sm">Delete</span>
						</button>
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
