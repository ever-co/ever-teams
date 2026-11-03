'use client';

import * as React from 'react';
import { endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from '@/core/components/icons';
import { DateRange } from 'react-day-picker';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';
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
	defaultValue?: DateRange;
	onChange: (dateRange: DateRange) => void;
	className?: string;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>(defaultValue);
	const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(defaultValue);
	const [isOpen, setIsOpen] = React.useState(false);
	const t = useTranslations();

	return (
		<div className={cn('grid gap-2')}>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						size="default"
						className={cn(
							'w-[16rem] justify-start overflow-hidden text-clip text-left font-normal',
							!date && 'text-muted-foreground',
							className
						)}
					>
						<CalendarIcon className="text-muted-foreground" />
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
				<PopoverContent className="flex p-0 w-auto" align="start">
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
					<div className="flex w-44 flex-col gap-1 hairline-l border-border">
						<PresetDates date={selectedDate} setDate={setSelectedDate} />
						<div className="flex flex-1 gap-1 justify-between items-center p-2">
							<Button
								className="grow"
								variant={'outline'}
								size="default"
								onClick={() => {
									setIsOpen(false);
								}}
							>
								{t('common.CANCEL')}
							</Button>
							<Button
								onClick={() => {
									if (selectedDate?.from && selectedDate?.to) {
										onChange(selectedDate);
										setDate(selectedDate);
										setIsOpen(false); // Close the popover after Apply
									} else {
										console.warn('Invalid date range selected');
									}
								}}
								className="grow"
								size="default"
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

function isSameRange(range: DateRange | undefined, target: { from: Date; to: Date }): boolean {
	if (!range?.from) return false;
	if (!range.to) return false;
	const isSameStart = isSameDay(range.from, target.from);
	const isSameEnd = isSameDay(range.to, target.to);
	return isSameStart && isSameEnd;
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
		<div className="flex w-full flex-col gap-0.5 p-1">
			{presets.map((preset) => {
				const isActive = isSameRange(selected, preset.range);
				return (
					<Button
						key={preset.label}
						onClick={() => setDate(preset.range)}
						variant="ghost"
						aria-pressed={isActive}
						className={cn(
							'justify-start truncate px-2 text-left text-sm font-normal',
							isActive && 'bg-foreground/5 font-medium text-foreground'
						)}
					>
						{preset.label}
					</Button>
				);
			})}
		</div>
	);
};
