'use client';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/common/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { DateRange } from 'react-day-picker';
import moment from 'moment';
import { IDailyPlan } from '@/core/types/interfaces/to-review';

interface ITaskDatePickerWithRange {
	className?: string;
	date?: DateRange;

	onSelect?: (range: DateRange | undefined) => void;
	label?: string;
	data?: IDailyPlan[];
}
export function TaskDatePickerWithRange({ className, date, onSelect, label, data }: ITaskDatePickerWithRange) {
	const isDateDisabled = (dateToCheck: Date) => {
		if (!data || !Array.isArray(data)) return true;

		const checkDate = moment(dateToCheck).format('YYYY-MM-DD');
		return !data.some((item) => {
			const itemDate = moment(item.date).format('YYYY-MM-DD');
			return itemDate === checkDate;
		});
	};
	const handleDateSelect = (newDate: DateRange | undefined) => {
		if (onSelect) {
			onSelect(newDate);
		}
	};
	return (
		<div className={cn('grid gap-2', className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						className={cn(
							'w-[230px] justify-start text-left font-normal dark:bg-dark--theme-light rounded-xl  mt-4 mb-2 lg:mt-0 h-9',
							!date && 'text-muted-foreground'
						)}
					>
						<CalendarDays className="mr-2 w-4 h-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'dd.MM.yyyy')} - {format(date.to, 'dd.MM.yyyy')}
								</>
							) : (
								format(date.from, 'dd.MM.yyyy')
							)
						) : (
							<span>{label}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0 w-auto" align="center">
					<Calendar
						className="dark:bg-dark--theme"
						initialFocus
						mode={'range'}
						defaultMonth={date?.from}
						selected={date}
						onSelect={handleDateSelect}
						numberOfMonths={2}
						disabled={isDateDisabled}
						modifiers={{
							hasData: (date: Date | undefined) => {
								if (!data || !Array.isArray(data)) return false;
								const checkDate = moment(date).format('YYYY-MM-DD');
								return data.some((item) => {
									const itemDate = moment(item.date).format('YYYY-MM-DD');
									return itemDate === checkDate;
								});
							}
						}}
						modifiersClassNames={{
							hasData:
								'relative before:absolute before:content-[""] before:w-1 before:h-1 before:bg-primary before:rounded-full before:bottom-1 before:left-1/2 before:-translate-x-1/2'
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
