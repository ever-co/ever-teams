'use client';

import * as React from 'react';
import { endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/common/button2';
import { Calendar } from '@/core/components/common/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

/**
 * DatePickerWithRange component provides a date range picker with preset ranges.
 * Users can select a custom date range or choose from predefined ranges.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {DateRange} props.defaultValue - The initial default date range.
 * @param {(dateRange: DateRange) => void} props.onChange - Callback function invoked when the date range is changed.
 *
 * @returns {JSX.Element} A date range picker with custom and preset options.
 */

export function DatePickerWithRange({
	onChange,
	defaultValue,
	className
}: {
	defaultValue: DateRange;
	onChange: (dateRange: DateRange) => void;
	className?: string;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>(defaultValue);
	const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(defaultValue);
	const t = useTranslations();

	return (
		<div className={cn('grid gap-2')}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						className={cn(
							'w-[16rem] h-[2.2rem] justify-start text-left font-light',
							!date && 'text-muted-foreground',
							'overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent',
							className
						)}
					>
						<CalendarIcon />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
								</>
							) : (
								format(date.from, 'LLL dd, y')
							)
						) : (
							<span>{t('common.PICK_A_DATE')}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0 flex" align="start">
					<Calendar
						// @ts-ignore
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={selectedDate}
						onSelect={setSelectedDate}
						numberOfMonths={2}
						showOutsideDays={true}
					/>
					<div className="flex flex-col gap-1 w-44 border-l">
						<PresetDates date={selectedDate} setDate={setSelectedDate} />
						<div className="flex p-2 items-center flex-1 gap-1 justify-between">
							<Button className=" grow text-xs h-8" variant={'outline'} size={'sm'}>
								{t('common.CANCEL')}
							</Button>
							<Button
								onClick={() => {
									if (selectedDate?.from && selectedDate?.to) {
										onChange(selectedDate);
										setDate(selectedDate);
									} else {
										console.warn('Invalid date range selected');
									}
								}}
								className=" grow text-xs h-8 dark:text-white"
								size={'sm'}
							>
								{t('common.APPLY')}
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

/**
 * PresetDates component displays a list of predefined date ranges that users can select.
 * It updates the selected date range in the parent DatePickerWithRange component.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {React.Dispatch<React.SetStateAction<DateRange | undefined>>} props.setDate - Function to set the selected date range.
 * @param {DateRange | undefined} props.date - The currently selected date range.
 *
 * @returns {JSX.Element} A list of buttons representing preset date ranges.
 */

const PresetDates = ({
	setDate,
	date
}: {
	setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
	date: DateRange | undefined;
}) => {
	const t = useTranslations();

	const presets = useMemo(
		() => [
			{ label: t('common.TODAY'), range: { from: new Date(), to: new Date() } },
			{ label: t('common.YESTERDAY'), range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
			{ label: t('common.THIS_WEEK'), range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
			{
				label: t('common.LAST_WEEK'),
				range: { from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7)) }
			},
			{ label: t('common.THIS_MONTH'), range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
			{
				label: t('common.LAST_MONTH'),
				range: {
					from: startOfMonth(subMonths(new Date(), 1)),
					to: endOfMonth(subMonths(new Date(), 1))
				}
			},
			{ label: t('common.FILTER_LAST_7_DAYS'), range: { from: subDays(new Date(), 7), to: new Date() } },
			{ label: t('common.LAST_TWO_WEEKS'), range: { from: subDays(new Date(), 14), to: new Date() } }
		],
		[t]
	);

	const [selected, setSelected] = React.useState<DateRange>();

	useEffect(() => {
		setSelected(
			presets.find((preset) => {
				return (
					date?.from &&
					date.to &&
					isSameDay(date?.from, preset.range.from) &&
					isSameDay(date?.to, preset.range.to)
				);
			})?.range
		);
	}, [date?.from, date?.to, presets, date]);

	return (
		<div className="flex flex-col w-full p-2 gap-1">
			{presets.map((preset) => (
				<Button
					key={preset.label}
					onClick={() => setDate(preset.range)}
					variant={
						selected?.from &&
						selected.to &&
						isSameDay(selected?.from, preset.range.from) &&
						isSameDay(selected?.to, preset.range.to)
							? 'default'
							: 'outline'
					}
					className={cn(
						' truncate text-left text-sm h-8 px-2 py-1 font-normal border rounded',
						selected?.from &&
							selected.to &&
							isSameDay(selected?.from, preset.range.from) &&
							isSameDay(selected?.to, preset.range.to) &&
							'dark:text-white'
					)}
				>
					{preset.label}
				</Button>
			))}
		</div>
	);
};
