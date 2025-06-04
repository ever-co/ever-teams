import React from 'react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/common/button';
import { DatePicker } from '@/core/components/common/date-picker';
import { cn } from '@/core/lib/helpers';
import { format } from 'date-fns';
import { useTimelogFilterOptions } from '@/core/hooks';
import { IconsCalendarMonthOutline } from '@/core/components/icons';
import { ETimeFrequency } from '@/core/types/generics/enums/date';

interface DatePickerInputProps {
	date: Date | null;
	label: string;
}

export function FrequencySelect() {
	const { setTimesheetGroupByDays, timesheetGroupByDays } = useTimelogFilterOptions();

	const handleSelectChange = (value: string) => {
		setTimesheetGroupByDays(value as ETimeFrequency);
	};

	return (
		<Select value={timesheetGroupByDays} onValueChange={handleSelectChange}>
			<SelectTrigger className="min-w-24 w-fit overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
				<SelectValue placeholder="Select a daily" />
			</SelectTrigger>
			<SelectContent className="w-fit">
				<SelectGroup>
					<SelectItem value="Daily">Daily</SelectItem>
					<SelectItem value="Weekly">Weekly</SelectItem>
					<SelectItem value="Monthly">Monthly</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

export const FilterTaskActionMenu = () => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div className="w-[120px]">
					<Button variant="ghost" className="text-sm font-normal">
						<span className="sr-only">Open menu</span>
						<span className="">20-10-20</span>
					</Button>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer hover:bg-primary">
					Today
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer hover:bg-primary">
					Last 7 days
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer hover:bg-primary">
					Last 30 days
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer hover:bg-primary">
					This year ({new Date().getFullYear()})
				</DropdownMenuItem>
				<CustomDateRange />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const CustomDateRange = () => {
	const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
		from: new Date(),
		to: new Date()
	});
	const [isDropdownOpen, setDropdownOpen] = React.useState(true);

	const cancelChanges = () => {
		setDropdownOpen(false);
	};
	const applyChanges = () => {
		setDropdownOpen(false);
	};
	const handleFromChange = (fromDate: Date | null) => {
		setDateRange((prev) => ({ ...prev, from: fromDate }));
	};

	const handleToChange = (toDate: Date | null) => {
		if (dateRange.from && toDate && toDate < dateRange.from) {
			return;
		}
		setDateRange((prev) => ({ ...prev, to: toDate }));
	};
	return (
		<DropdownMenuSub open={isDropdownOpen} onOpenChange={setDropdownOpen}>
			<DropdownMenuSubTrigger>
				<span>Custom Date Range</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent className="bg-white hover:bg-white">
					<DropdownMenuItem className="bg-white cursor-pointer hover:bg-white">
						<div className="flex flex-col gap-3">
							<DynamicDatePicker label="From" date={dateRange.from} setDate={handleFromChange} />
							<DynamicDatePicker label="To" date={dateRange.to} setDate={handleToChange} />
							<div className="flex justify-end w-full gap-4">
								<button className="text-primary" onClick={cancelChanges}>
									Cancel
								</button>
								<button className="text-primary" onClick={applyChanges}>
									Apply
								</button>
							</div>
						</div>
					</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	);
};

const DatePickerInput: React.FC<DatePickerInputProps> = ({ date, label }) => (
	<>
		<Button
			variant="outline"
			className={cn(
				'w-[150px] justify-start text-left font-normal text-black h-10 border border-transparent dark:border-transparent',
				!date && 'text-muted-foreground'
			)}
		>
			{date ? format(date, 'LLL dd, y') : <span>{label}</span>}
		</Button>
		<IconsCalendarMonthOutline className="w-5 h-5 dark:text-gray-500" />
	</>
);

export function DynamicDatePicker({
	label,
	date,
	setDate
}: {
	label: string;
	date: Date | null;
	setDate: (date: Date | null) => void;
}) {
	return (
		<div>
			<DatePicker
				buttonVariant={'link'}
				// @ts-ignore
				className="bg-white rounded-lg dark:bg-dark--theme-light"
				buttonClassName={
					'decoration-transparent flex items-center w-full bg-white dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black h-10 border dark:border-slate-600 rounded-md'
				}
				customInput={<DatePickerInput date={date} label={label} />}
				mode="single"
				numberOfMonths={1}
				initialFocus
				defaultMonth={date ?? new Date()}
				selected={date ?? new Date()}
				onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
			/>
		</div>
	);
}
