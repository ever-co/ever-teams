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
import { controlGroupRecipe } from '@/core/components/common/input';
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
			<SelectTrigger className="h-8 min-w-24 w-fit overflow-hidden text-clip">
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
					<Button variant="ghost" size="default" className="font-normal">
						<span className="sr-only">Open menu</span>
						<span className="">20-10-20</span>
					</Button>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer">
					Today
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer">
					Last 7 days
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer">
					Last 30 days
				</DropdownMenuItem>
				<DropdownMenuItem onClick={(e) => e.preventDefault()} className="cursor-pointer">
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
				<DropdownMenuSubContent>
					<DropdownMenuItem className="cursor-pointer data-highlighted:bg-transparent">
						<div className="flex flex-col gap-3">
							<DynamicDatePicker label="From" date={dateRange.from} setDate={handleFromChange} />
							<DynamicDatePicker label="To" date={dateRange.to} setDate={handleToChange} />
							<div className="flex justify-end w-full gap-4">
								<button
									className="rounded-sm text-sm text-primary-ink hover:underline underline-offset-4"
									onClick={cancelChanges}
								>
									Cancel
								</button>
								<button
									className="rounded-sm text-sm text-primary-ink hover:underline underline-offset-4"
									onClick={applyChanges}
								>
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
			className={cn('w-[150px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
		>
			{date ? format(date, 'LLL dd, y') : <span>{label}</span>}
		</Button>
		<IconsCalendarMonthOutline className="size-4 text-muted-foreground" />
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
				className="rounded-lg bg-popover"
				buttonClassName={cn(
					controlGroupRecipe,
					'decoration-transparent h-9 justify-start px-1 text-left font-normal'
				)}
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
