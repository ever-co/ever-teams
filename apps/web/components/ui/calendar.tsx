import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DropdownProps } from 'react-day-picker';

import { cn } from 'lib/utils';
import { buttonVariants } from 'components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ScrollArea } from './scroll-bar';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn('p-3', className)}
			classNames={{
				months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
				month: 'space-y-4',
				vhidden: 'vhidden hidden',
				caption: 'flex justify-center pt-1 relative items-center',
				caption_label: 'text-sm font-medium',
				caption_dropdowns: cn('flex justify-between gap-1', props.captionLayout === 'dropdown' && 'w-full'),
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
				cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
				day: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal aria-selected:opacity-100'),
				day_selected:
					'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
				day_today: 'bg-accent text-accent-foreground',
				day_outside: 'text-muted-foreground opacity-50',
				day_disabled: 'text-muted-foreground opacity-50',
				day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
				day_hidden: 'invisible',
				...classNames
			}}
			components={{
				Dropdown: ({ value, onChange, children, ...props }: DropdownProps) => {
					const options = React.Children.toArray(children) as React.ReactElement<
						React.HTMLProps<HTMLOptionElement>
					>[];
					const selected = options.find((child) => child.props.value === value);
					const handleChange = (value: string) => {
						const changeEvent = {
							target: { value }
						} as React.ChangeEvent<HTMLSelectElement>;
						onChange?.(changeEvent);
					};
					return (
						<Select
							value={value?.toString()}
							onValueChange={(value) => {
								handleChange(value);
							}}
						>
							<SelectTrigger className="pr-1.5 focus:ring-0 dark:bg-dark--theme-light border-none">
								<SelectValue>{selected?.props?.children}</SelectValue>
							</SelectTrigger>
							<SelectContent position="popper" className="dark:bg-dark--theme-light z-[9999] border-none">
								<ScrollArea className="h-60 max-h-min">
									{options.map((option, id: number) => (
										<SelectItem
											key={`${option.props.value}-${id}`}
											value={option.props.value?.toString() ?? ''}
										>
											{option.props.children}
										</SelectItem>
									))}
								</ScrollArea>
							</SelectContent>
						</Select>
					);
				},
				IconLeft,
				IconRight
			}}
			{...props}
		/>
	);
}

function IconRight({ ...props }) {
	return <ChevronRight className="h-4 w-4" {...props} />;
}

function IconLeft({ ...props }) {
	return <ChevronLeft className="h-4 w-4" {...props} />;
}

Calendar.displayName = 'Calendar';

export { Calendar };
