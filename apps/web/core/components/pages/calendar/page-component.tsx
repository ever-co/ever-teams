import { useTranslations } from 'next-intl';
import { DatePicker } from '@/core/components/common/date-picker';
import { format } from 'date-fns';
import { Button } from '@/core/components';
import { TimeSheetFilter, timesheetCalendar } from '@/core/components/integration/calendar';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { cn } from '@/core/lib/helpers';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { Input, controlGroupRecipe } from '@/core/components/common/input';
import { Calendar, Filter, ListView } from '@/core/components/icons';
import { SegmentedControl } from '@/core/components/common/segmented-control';

export function HeadCalendar({
	openModal,
	timesheet,
	setCalendarTimeSheet,
	children
}: {
	openModal?: () => void;
	timesheet: timesheetCalendar;
	setCalendarTimeSheet: React.Dispatch<React.SetStateAction<timesheetCalendar>>;
	/** The team view switch, rendered with the page controls at the right of the title row. */
	children?: React.ReactNode;
}) {
	const t = useTranslations();
	const isCalendarView = timesheet === 'Calendar';
	let title = t('pages.timesheet.TIMESHEET_TITLE');
	if (isCalendarView) {
		title = t('common.CALENDAR');
	}
	return (
		<div className="flex flex-col gap-3 py-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-lg font-semibold text-balance">{title}</h1>
				<div className="flex flex-wrap items-center gap-2">
					{children}
					<SegmentedControl
						items={[
							{ value: 'TimeSheet', icon: <ListView />, ariaLabel: t('pages.timesheet.TIMESHEET_TITLE') },
							{ value: 'Calendar', icon: <Calendar />, ariaLabel: t('common.CALENDAR') }
						]}
						value={timesheet}
						onValueChange={setCalendarTimeSheet}
						ariaLabel={t('common.VIEW')}
					/>
					<Button onClick={openModal} variant="primary" size="default">
						{t('common.ADD_TIME')}
					</Button>
				</div>
			</div>
			<p className="rounded-lg bg-info/10 px-3 py-2 text-sm text-info-foreground">
				{t('common.CALENDAR_SAMPLE_DATA')}
			</p>
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
	// Nothing is preselected: no range is applied to the data until the user picks one.
	const [date, setDate] = React.useState<DateRange | undefined>(undefined);
	return (
		<div>
			{closeModal ? <TimeSheetFilter closeModal={closeModal} isOpen={isOpen ?? false} /> : <></>}

			<div className="flex items-center justify-between w-full h-28">
				{timesheet === 'TimeSheet' && (
					<div className="flex justify-between items-center w-full p-2 gap-x-3">
						<Input className="h-8 w-1/4" placeholder="Filter time logs" required value="" name="filter" />

						<div className="flex items-center justify-end gap-2 w-full p-2">
							<div>
								<CustomSelect />
							</div>
							<div className="">
								<DatePicker
									buttonVariant={'link'}
									className="rounded-lg bg-popover"
									buttonClassName={cn(
										controlGroupRecipe,
										'decoration-transparent h-8 justify-start gap-2 px-2.5 text-left font-normal text-foreground'
									)}
									customInput={
										<>
											<Calendar className="size-4 shrink-0 text-muted-foreground" />
											<Button
												variant="ghost"
												size="sm"
												className={cn(
													'w-[260px] justify-start px-0 text-left font-normal text-foreground hover:bg-transparent',
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
								<Button onClick={openModal} variant="outline" size="default">
									<Filter className="text-muted-foreground" />
									<div className="gap-x-2 flex items-center w-full">
										<span>Filter</span>
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
	const t = useTranslations();
	const [selectedValue, setSelectedValue] = React.useState<string | undefined>(undefined);

	const handleSelectChange = (value: string) => {
		setSelectedValue(value);
	};

	return (
		<Select value={selectedValue} onValueChange={handleSelectChange}>
			<SelectTrigger className="h-8 w-[180px]">
				<SelectValue placeholder="Select a daily" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectItem value="daily">{t('dashboard.DAILY')}</SelectItem>
					<SelectItem value="weekly">{t('dashboard.WEEKLY')}</SelectItem>
					<SelectItem value="monthly">{t('dashboard.MONTHLY')}</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
