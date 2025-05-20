import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, CaptionProps, useNavigation } from 'react-day-picker';
import * as SelectPrimitive from '@radix-ui/react-select';

import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/core/components/common/select';

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

// Short day names for the calendar header

const generateYears = (): number[] => {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
};

// Custom SelectItem without checkmark
const CustomSelectItem = React.forwardRef<
	React.ComponentRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		{...props}
	>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
CustomSelectItem.displayName = 'CustomSelectItem';

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
		<div className="flex items-center justify-between py-1">
			<div className="flex items-center justify-between gap-1 w-full">
				<div className="relative z-[999]">
					<Select value={MONTHS[displayMonth.getMonth()]} onValueChange={handleMonthChange}>
						<SelectTrigger className="h-8 text-sm font-medium bg-transparent border-none hover:bg-gray-50 dark:hover:bg-gray-700 transition px-2 focus:ring-0 text-gray-700 dark:text-gray-300">
							<SelectValue placeholder="Month" />
						</SelectTrigger>
						<SelectContent
							position="popper"
							sideOffset={4}
							className="z-[9999] bg-white dark:bg-gray-800 rounded-md py-1 shadow-md dark:border dark:border-gray-700 max-h-[200px] overflow-y-auto"
						>
							{MONTHS.map((month, index) => (
								<CustomSelectItem
									key={month}
									value={month}
									className={cn(
										'text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition dark:text-gray-300',
										displayMonth.getMonth() === index ? 'bg-gray-100 dark:bg-gray-700' : ''
									)}
								>
									{month}
								</CustomSelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="relative z-[999]">
					<Select value={displayMonth.getFullYear().toString()} onValueChange={handleYearChange}>
						<SelectTrigger className="h-8 text-sm font-medium bg-transparent border-none hover:bg-gray-50 dark:hover:bg-gray-700 transition px-2 focus:ring-0 text-gray-700 dark:text-gray-300">
							<SelectValue placeholder="Year" />
						</SelectTrigger>
						<SelectContent
							position="popper"
							sideOffset={4}
							className="z-[9999] bg-white dark:bg-gray-800 rounded-md py-1 shadow-md dark:border dark:border-gray-700 max-h-[200px] overflow-y-auto"
						>
							{years.map((year) => (
								<CustomSelectItem
									key={year}
									value={year.toString()}
									className={cn(
										'text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition dark:text-gray-300',
										displayMonth.getFullYear() === year ? 'bg-gray-100 dark:bg-gray-700' : ''
									)}
								>
									{year}
								</CustomSelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
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
	captionLayout = 'dropdown',
	onMonthChange,
	...props
}: CalendarProps & { onMonthChange?: (date: Date) => void }) {
	return (
		<DayPicker
			weekStartsOn={1} // Start week on Monday
			showOutsideDays={showOutsideDays}
			captionLayout={captionLayout}
			className={cn('p-4 rounded-lg   bg-white dark:bg-dark--theme-light', className)}
			classNames={{
				months: 'flex flex-col space-y-4',
				month: 'space-y-4',
				caption: 'flex justify-between pt-1 relative items-center px-2',
				caption_label: 'text-sm font-medium dark:text-gray-300',
				nav: 'space-x-1 flex items-center',
				nav_button: cn(
					buttonVariants({ variant: 'ghost' }),
					'h-7 w-7 bg-transparent p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'
				),
				nav_button_previous: 'absolute left-1',
				nav_button_next: 'absolute right-1',
				table: 'w-full border-collapse',
				head_row: 'flex w-full mb-1',
				head_cell: 'text-gray-500 dark:text-gray-400 w-9 font-medium text-[0.8rem] flex-1 text-center py-2',
				row: 'flex w-full mt-1',
				cell: cn(
					'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 my-0.5',
					'[&:has([aria-selected])]:bg-transparent'
				),
				day: cn(
					'h-9 w-9 p-0 mx-auto font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors dark:text-gray-300'
				),
				day_selected: cn(
					'bg-indigo-600 dark:bg-indigo-500 text-white font-medium',
					'hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:text-white',
					'focus:bg-indigo-700 dark:focus:bg-indigo-600 focus:text-white'
				),
				day_today: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 font-medium',
				day_outside: 'text-gray-300 dark:text-gray-600 opacity-50',
				day_disabled: 'text-gray-300 dark:text-gray-600 opacity-50',
				day_hidden: 'invisible',
				...classNames
			}}
			components={{
				IconLeft: ({ className, ...props }) => (
					<ChevronLeft className={cn('h-4 w-4 text-gray-600 dark:text-gray-400', className)} {...props} />
				),
				IconRight: ({ className, ...props }) => (
					<ChevronRight className={cn('h-4 w-4 text-gray-600 dark:text-gray-400', className)} {...props} />
				),
				Caption: (props) => <CustomCaption {...props} onMonthChange={onMonthChange} />
			}}
			{...props}
		/>
	);
}

Calendar.displayName = 'Calendar';

export { Calendar };
