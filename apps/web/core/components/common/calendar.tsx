import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, CaptionProps, useNavigation } from 'react-day-picker';

import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';

// Constants
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

// Generate years array dynamically (current year + 5 years ahead)
const generateYears = (): number[] => {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: 6 }, (_, i) => currentYear + i);
};

// Types
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

interface CustomCaptionProps extends CaptionProps {
	onMonthChange?: (date: Date) => void;
}

/**
 * Custom caption component for the calendar that provides month and year selection
 */
function CustomCaption({ displayMonth, onMonthChange }: CustomCaptionProps) {
	const { goToMonth } = useNavigation();
	const years = generateYears();

	/**
	 * Handles month selection change
	 * @param value - Selected month name
	 */
	const handleMonthChange = (value: string) => {
		const monthIndex = MONTHS.findIndex((month) => month === value);
		if (monthIndex !== -1) {
			const newDate = new Date(displayMonth);
			newDate.setMonth(monthIndex);
			goToMonth(newDate);
			onMonthChange?.(newDate);
		}
	};

	/**
	 * Handles year selection change
	 * @param value - Selected year as string
	 */
	const handleYearChange = (value: string) => {
		const year = parseInt(value, 10);
		if (!isNaN(year)) {
			const newDate = new Date(displayMonth);
			newDate.setFullYear(year);
			goToMonth(newDate);
			onMonthChange?.(newDate);
		}
	};

	return (
		<div className="flex items-center justify-center gap-2 py-1">
			<div className="w-32 relative z-[999]">
				<Select value={MONTHS[displayMonth.getMonth()]} onValueChange={handleMonthChange}>
					<SelectTrigger className="h-8 text-sm font-medium bg-white border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2">
						<SelectValue placeholder="Month" />
					</SelectTrigger>
					<SelectContent position="popper" sideOffset={4} className="z-[9999] bg-white">
						{MONTHS.map((month) => (
							<SelectItem key={month} value={month} className="text-sm cursor-pointer hover:bg-gray-100">
								{month}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="w-20 relative z-[999]">
				<Select value={displayMonth.getFullYear().toString()} onValueChange={handleYearChange}>
					<SelectTrigger className="h-8 text-sm font-medium bg-white border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2">
						<SelectValue placeholder="Year" />
					</SelectTrigger>
					<SelectContent position="popper" sideOffset={4} className="z-[9999] bg-white">
						{years.map((year) => (
							<SelectItem
								key={year}
								value={year.toString()}
								className="text-sm cursor-pointer hover:bg-gray-100"
							>
								{year}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

/**
 * Calendar component that extends react-day-picker with custom styling and functionality
 */
function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	captionLayout = 'buttons',
	onMonthChange,
	...props
}: CalendarProps & { onMonthChange?: (date: Date) => void }) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			captionLayout={captionLayout}
			className={cn('p-3', className)}
			classNames={{
				months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
				month: 'space-y-4',
				caption: 'flex justify-center pt-1 relative items-center',
				caption_label: 'text-sm font-medium',
				nav: 'space-x-1 flex items-center',
				nav_button: cn(
					buttonVariants({ variant: 'outline' }),
					'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
				),
				nav_button_previous: 'absolute left-1',
				nav_button_next: 'absolute right-1',
				table: 'w-full border-collapse space-y-1',
				head_row: 'flex',
				head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
				row: 'flex w-full mt-2',
				cell: cn(
					'h-9 w-9 text-center text-sm p-0 relative',
					'[&:has([aria-selected].day-range-end)]:rounded-r-md',
					'[&:has([aria-selected].day-outside)]:bg-accent/50',
					'[&:has([aria-selected])]:bg-accent',
					'first:[&:has([aria-selected])]:rounded-l-md',
					'last:[&:has([aria-selected])]:rounded-r-md',
					'focus-within:relative focus-within:z-20'
				),
				day: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal aria-selected:opacity-100'),
				day_range_end: 'day-range-end',
				day_selected: cn(
					'bg-primary text-primary-foreground',
					'hover:bg-primary hover:text-primary-foreground',
					'focus:bg-primary focus:text-primary-foreground'
				),
				day_today: 'bg-accent text-accent-foreground',
				day_outside: cn(
					'day-outside text-muted-foreground',
					'aria-selected:bg-accent/50 aria-selected:text-muted-foreground'
				),
				day_disabled: 'text-muted-foreground opacity-50',
				day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
				day_hidden: 'invisible',
				...classNames
			}}
			components={{
				IconLeft: ({ className, ...props }) => <ChevronLeft className={cn('h-4 w-4', className)} {...props} />,
				IconRight: ({ className, ...props }) => (
					<ChevronRight className={cn('h-4 w-4', className)} {...props} />
				),
				Caption:
					captionLayout === 'dropdown'
						? (props) => <CustomCaption {...props} onMonthChange={onMonthChange} />
						: undefined
			}}
			{...props}
		/>
	);
}

Calendar.displayName = 'Calendar';

export { Calendar };
