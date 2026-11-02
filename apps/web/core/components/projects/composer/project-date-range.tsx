'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { addDays, addMonths, addWeeks, differenceInCalendarDays, nextMonday, startOfDay } from 'date-fns';
import { Calendar } from '@/core/components/common/calendar';
import { MENU_ROW, MENU_SEPARATOR } from '@/core/components/common/menu-recipes';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { formatProjectDay } from '@/core/components/projects/project-cells';
import { cn } from '@/core/lib/helpers';
import { EMPTY_VALUE, VALUE_BUTTON } from './composer-recipes';
import { DateGlyph } from '@/core/components/common/value-glyphs';

interface DatePreset {
	key: string;
	label: string;
	date: Date;
}

const YEARS_BACK = 5;
const YEARS_AHEAD = 10;

function useStartPresets(): DatePreset[] {
	const t = useTranslations();
	const today = startOfDay(new Date());
	return [
		{ key: 'today', label: t('common.TODAY'), date: today },
		{ key: 'tomorrow', label: t('common.TOMORROW'), date: addDays(today, 1) },
		{ key: 'next-monday', label: t('pages.projects.modals.dates.nextMonday'), date: nextMonday(today) }
	];
}

/** Target presets count from the start, so the end is after the start by construction. */
function useEndPresets(start: Date | null): DatePreset[] {
	const t = useTranslations();
	const from = startOfDay(start ?? new Date());
	return [
		{ key: 'one-week', label: t('pages.projects.modals.dates.inOneWeek'), date: addWeeks(from, 1) },
		{ key: 'two-weeks', label: t('pages.projects.modals.dates.inTwoWeeks'), date: addWeeks(from, 2) },
		{ key: 'one-month', label: t('pages.projects.modals.dates.inOneMonth'), date: addMonths(from, 1) },
		{ key: 'three-months', label: t('pages.projects.modals.dates.inThreeMonths'), date: addMonths(from, 3) }
	];
}

function disabledDaysBefore(minDate: Date | null | undefined) {
	if (!minDate) {
		return undefined;
	}
	return { before: addDays(startOfDay(minDate), 1) };
}

interface DateSideProps {
	value: Date | null;
	placeholder: string;
	ariaLabel: string;
	presets: DatePreset[];
	minDate?: Date | null;
	onChange: (date: Date) => void;
}

function DateSide({ value, placeholder, ariaLabel, presets, minDate, onChange }: DateSideProps) {
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const currentYear = new Date().getFullYear();
	const hasValue = Boolean(value);

	const pick = (date: Date | undefined) => {
		if (!date) {
			return;
		}
		onChange(date);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger aria-label={ariaLabel} className={cn(VALUE_BUTTON, 'tabular-nums')}>
				{hasValue && value && formatProjectDay(value, locale)}
				{!hasValue && <span className={EMPTY_VALUE}>{placeholder}</span>}
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={6} className="w-auto p-1">
				<div className="flex flex-col">
					{presets.map((preset) => (
						<button key={preset.key} type="button" onClick={() => pick(preset.date)} className={MENU_ROW}>
							<DateGlyph date={preset.date} />
							<span className="flex-1">{preset.label}</span>
							<span className="text-xs text-muted-foreground tabular-nums">
								{formatProjectDay(preset.date, locale)}
							</span>
						</button>
					))}
				</div>
				<div className={MENU_SEPARATOR} />
				<Calendar
					mode="single"
					selected={value ?? undefined}
					defaultMonth={value ?? undefined}
					onSelect={pick}
					disabled={disabledDaysBefore(minDate)}
					fromYear={currentYear - YEARS_BACK}
					toYear={currentYear + YEARS_AHEAD}
					captionLayout="dropdown-buttons"
					className="bg-transparent p-1"
				/>
			</PopoverContent>
		</Popover>
	);
}

function dayCountOf(startDate: Date | null, endDate: Date | null) {
	if (!startDate) {
		return 0;
	}
	if (!endDate) {
		return 0;
	}
	return differenceInCalendarDays(endDate, startDate);
}

interface ProjectDateRangeProps {
	startDate: Date | null;
	endDate: Date | null;
	onStartChange: (date: Date) => void;
	onEndChange: (date: Date) => void;
}

export function ProjectDateRange({ startDate, endDate, onStartChange, onEndChange }: ProjectDateRangeProps) {
	const t = useTranslations();
	const startPresets = useStartPresets();
	const endPresets = useEndPresets(startDate);
	const dayCount = dayCountOf(startDate, endDate);
	const showsDayCount = dayCount > 0;

	return (
		<span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
			<DateSide
				value={startDate}
				placeholder={t('pages.projects.modals.dates.start')}
				ariaLabel={t('common.START_DATE')}
				presets={startPresets}
				onChange={onStartChange}
			/>
			<span aria-hidden="true" className="text-[13px] text-muted-foreground">
				→
			</span>
			<DateSide
				value={endDate}
				placeholder={t('pages.projects.modals.dates.target')}
				ariaLabel={t('common.END_DATE')}
				presets={endPresets}
				minDate={startDate}
				onChange={onEndChange}
			/>
			{showsDayCount && (
				<span className="ml-1 text-xs text-muted-foreground tabular-nums">
					{t('pages.projects.modals.dates.dayCount', { count: dayCount })}
				</span>
			)}
		</span>
	);
}
