'use client';

import * as React from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';

export function DatePickerWithRange({
	onChange,
	defaultValue
}: {
	defaultValue: DateRange;
	onChange: (dateRange: DateRange) => void;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>(defaultValue);
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
							'overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent'
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
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
					<div className="flex flex-col gap-1 w-44 border-l">
						<PresetDates setDate={setDate} />
						<div className="flex p-2 items-center flex-1 gap-1 justify-between">
							<Button className=" grow text-xs h-8" variant={'outline'} size={'sm'}>
								{t('common.CANCEL')}
							</Button>
							<Button
								onClick={() => date != undefined && onChange(date)}
								className=" grow text-xs h-8"
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

const PresetDates = ({ setDate }: { setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>> }) => {
	const t = useTranslations();

	const presets = [
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
			range: { from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) }
		},
		{ label: t('common.FILTER_LAST_7_DAYS'), range: { from: subDays(new Date(), 7), to: new Date() } },
		{ label: t('common.LAST_TWO_WEEKS'), range: { from: subDays(new Date(), 14), to: new Date() } }
	];

	return (
		<div className="flex flex-col w-full p-2 gap-1">
			{presets.map((preset) => (
				<button
					key={preset.label}
					onClick={() => setDate(preset.range)}
					className="text-left px-2 py-1 hover:bg-primary/10 font-normal border rounded"
				>
					{preset.label}
				</button>
			))}
		</div>
	);
};
