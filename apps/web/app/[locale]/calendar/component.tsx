import { clsxm } from '@app/utils';
import { DatePicker } from '@/core/components/ui/DatePicker';
import { QueueListIcon } from '@heroicons/react/20/solid';
import { addDays, format } from 'date-fns';
import { Button } from '@/core/components';
import { TimeSheetFilter, timesheetCalendar } from '@/core/components/features/integrations/calendar';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/ui/select';
import { cn } from '@/core/lib/helpers';
import { CalendarDays } from 'lucide-react';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { Input } from '@/core/components/ui/input';
import { SettingFilterIcon } from 'assets/svg';
import { IconsCalendarMonthOutline } from '@/icons';

export function HeadCalendar({
	openModal,
	timesheet,
	setCalendarTimeSheet
}: {
	openModal?: () => void;
	timesheet: timesheetCalendar;
	setCalendarTimeSheet: React.Dispatch<React.SetStateAction<timesheetCalendar>>;
}) {
	return (
		<div className="flex justify-between items-center mt-10 bg-white dark:bg-dark-high py-2">
			<h1 className="text-4xl font-semibold">{timesheet === 'Calendar' ? 'Calendar' : 'Timesheet'}</h1>
			<div className="flex items-center space-x-3">
				<button
					onClick={() => setCalendarTimeSheet('TimeSheet')}
					className={clsxm(
						'hover:bg-gray-200 dark:hover:bg-gray-700 text-xl h-10 w-10 rounded-lg flex items-center justify-center',
						`${timesheet === 'TimeSheet' ? 'bg-gray-200 dark:bg-gray-700' : ''}`
					)}
				>
					<QueueListIcon className={clsxm('w-5 h-5')} />
				</button>
				<button
					onClick={() => setCalendarTimeSheet('Calendar')}
					className={clsxm(
						'hover:bg-gray-200 dark:hover:bg-gray-700 text-xl h-10 w-10 rounded-lg flex items-center justify-center',
						`${timesheet === 'Calendar' ? 'bg-gray-200 dark:bg-gray-700' : ''}`
					)}
				>
					<IconsCalendarMonthOutline className={clsxm('w-5 h-5')} strokeWidth="1.8" />
				</button>
				<Button onClick={openModal} variant="primary" className="bg-primary dark:bg-primary-light">
					Add Time
				</Button>
			</div>
		</div>
	);
}

export function HeadTimeSheet({
	timesheet,
	isOpen,
	openModal,
	closeModal
}: {
	timesheet?: timesheetCalendar;
	isOpen?: boolean;
	openModal?: () => void;
	closeModal?: () => void;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: new Date(2022, 0, 20),
		to: addDays(new Date(2022, 0, 20), 20)
	});
	return (
		<div>
			{closeModal ? <TimeSheetFilter closeModal={closeModal} isOpen={isOpen ?? false} /> : <></>}

			<div className="flex items-center justify-between w-full  dark:!bg-dark--theme h-28">
				{timesheet === 'TimeSheet' && (
					<div className="flex justify-between items-center w-full p-2  gap-x-3">
						<Input
							className="border w-1/4 dark:border-gray-700"
							placeholder="Filter time logs"
							required
							value=""
							name="filter"
						/>

						<div className="flex items-center justify-end space-x-5 dark:!bg-dark--theme  w-full p-2 ">
							<div>
								<CustomSelect />
							</div>
							<div className="">
								<DatePicker
									buttonVariant={'link'}
									className="dark:bg-dark--theme-light rounded-lg"
									buttonClassName={
										'decoration-transparent flex items-center w-full bg-white dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black  h-10 border  dark:border-slate-600 rounded-md"'
									}
									customInput={
										<>
											<CalendarDays className="h-5 w-5 dark:text-gray-500" />
											<Button
												variant={'outline'}
												className={cn(
													'w-[260px] justify-start text-left font-normal text-black  h-10 border border-transparent dark:border-transparent ',
													!date && 'text-muted-foreground'
												)}
											>
												{date?.from ? (
													date.to ? (
														<>
															{format(date.from, 'LLL dd, y')} -{' '}
															{format(date.to, 'LLL dd, y')}
														</>
													) : (
														format(date.from, 'LLL dd, y')
													)
												) : (
													<span>Pick a date</span>
												)}
											</Button>
										</>
									}
									mode={'range'}
									numberOfMonths={2}
									initialFocus
									defaultMonth={date?.from}
									// @ts-ignore
									selected={date as DateRange | undefined}
									onSelect={(value: any) => {
										value && setDate(value);
									}}
								/>
							</div>
							<div>
								<Button
									onClick={openModal}
									className="flex items-center justify-center h-10 rounded-lg bg-white dark:bg-dark--theme-light gap-x-3 border dark:border-gray-700 hover:bg-white"
								>
									<SettingFilterIcon
										className="text-gray-700 dark:text-white w-3.5"
										strokeWidth="1.8"
									/>
									<div className="gap-x-2 flex items-center w-full">
										<span className="text-gray-700 dark:text-white">Filter</span>
										<div className="bg-gray-700 dark:bg-white h-6 w-6 rounded-full flex items-center  justify-center text-whiten dark:text-gray-700">
											<span>6</span>
										</div>
									</div>
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export function CustomSelect() {
	const [selectedValue, setSelectedValue] = React.useState<string | undefined>(undefined);

	const handleSelectChange = (value: string) => {
		setSelectedValue(value);
	};

	return (
		<Select value={selectedValue} onValueChange={handleSelectChange}>
			<SelectTrigger className="w-[180px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light">
				<SelectValue placeholder="Select a daily" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectItem value="daily">Daily</SelectItem>
					<SelectItem value="weekly">Weekly</SelectItem>
					<SelectItem value="monthly">Monthly</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
