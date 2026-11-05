'use client';

import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { Calendar, compactCalendarClassNames } from '@/core/components/common/calendar';
import { MENU_ROW } from '@/core/components/common/menu-recipes';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	DEFAULT_PERIOD_PRESETS,
	formatPeriod,
	type Period,
	type PeriodPresetKey,
	periodOfPreset,
	presetOfPeriod,
	shiftPeriod,
	type WeekStart
} from '@/core/lib/utils/dashboard-period';
import { endOfDay, startOfDay } from 'date-fns';

const PRESET_LABEL_KEYS: Record<PeriodPresetKey, DottedLanguageObjectStringPaths> = {
	today: 'common.TODAY',
	yesterday: 'common.YESTERDAY',
	thisWeek: 'common.THIS_WEEK',
	lastWeek: 'common.LAST_WEEK',
	last7Days: 'common.FILTER_LAST_7_DAYS',
	last14Days: 'common.LAST_TWO_WEEKS',
	thisMonth: 'common.THIS_MONTH',
	lastMonth: 'common.LAST_MONTH'
};

const GROUP =
	'inline-flex h-8 shrink-0 items-center rounded-full bg-card p-0.5 hairline-ring ring-foreground/10 shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:bg-foreground/5';

const STEP_BUTTON =
	'inline-flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

const TRIGGER =
	'inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-foreground/5 [&_svg]:size-4 [&_svg]:text-muted-foreground';

function completedPeriodOf(range: DateRange | undefined): Period | null {
	const from = range?.from;
	const to = range?.to;
	if (!from || !to) {
		return null;
	}
	return { from: startOfDay(from), to: endOfDay(to) };
}

/**
 * The period of a report: previous and next arrows around a button that names the period ("This week" when it is a
 * preset, the dates otherwise). The button opens the presets, each with the dates it resolves to on the right, and a
 * calendar for a custom range that applies as soon as both ends are picked.
 */
export function PeriodPicker({
	value,
	onChange,
	presets = DEFAULT_PERIOD_PRESETS,
	weekStartsOn = 1,
	className
}: Readonly<{
	value: Period;
	onChange: (period: Period) => void;
	presets?: ReadonlyArray<PeriodPresetKey>;
	weekStartsOn?: WeekStart;
	className?: string;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [isOpen, setIsOpen] = useState(false);
	const [draft, setDraft] = useState<DateRange | undefined>();

	const activePreset = presetOfPeriod(value, presets, weekStartsOn);
	const periodText = formatPeriod(value, locale);
	const triggerLabel = triggerLabelOf(activePreset, periodText, t);

	const presetRows = useMemo(
		() =>
			presets.map((key) => {
				const period = periodOfPreset(key, weekStartsOn);
				return { key, period, label: t(PRESET_LABEL_KEYS[key]), dates: formatPeriod(period, locale) };
			}),
		[locale, presets, t, weekStartsOn]
	);

	const handleOpenChange = (nextOpen: boolean) => {
		setIsOpen(nextOpen);
		setDraft(undefined);
	};

	const pick = (period: Period) => {
		onChange(period);
		setDraft(undefined);
		setIsOpen(false);
	};

	const handleRangeSelect = (range: DateRange | undefined, clickedDay: Date) => {
		const isFirstClick = !draft?.from;
		if (isFirstClick) {
			setDraft({ from: clickedDay, to: undefined });
			return;
		}
		const completed = completedPeriodOf(range);
		if (!completed) {
			setDraft(range);
			return;
		}
		pick(completed);
	};

	const shownRange = draft ?? { from: value.from, to: value.to };

	return (
		<div className={cn(GROUP, className)} role="group" aria-label={t('dashboard.period.LABEL')}>
			<button
				type="button"
				className={STEP_BUTTON}
				aria-label={t('dashboard.period.PREVIOUS')}
				onClick={() => onChange(shiftPeriod(value, -1))}
			>
				<ChevronLeft />
			</button>
			<Popover open={isOpen} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>
					<button type="button" className={TRIGGER} title={periodText}>
						<CalendarIcon />
						<span className="truncate">{triggerLabel}</span>
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" sideOffset={6} className="flex w-auto p-0 max-sm:flex-col">
					<div className="flex w-60 flex-col gap-px p-1 sm:hairline-r sm:border-border max-sm:hairline-b">
						{presetRows.map((row) => {
							const isActive = row.key === activePreset;
							return (
								<button
									key={row.key}
									type="button"
									onClick={() => pick(row.period)}
									className={cn(MENU_ROW, isActive && 'bg-foreground/5')}
								>
									<span className="flex-1 truncate">{row.label}</span>
									<span className="text-xs tabular-nums text-muted-foreground">{row.dates}</span>
									{isActive && <SelectedMark />}
								</button>
							);
						})}
					</div>
					<div className="p-2">
						<Calendar
							mode="range"
							selected={shownRange}
							onSelect={handleRangeSelect}
							defaultMonth={value.from}
							numberOfMonths={1}
							showOutsideDays
							weekStartsOn={weekStartsOn}
							classNames={compactCalendarClassNames}
						/>
					</div>
				</PopoverContent>
			</Popover>
			<button
				type="button"
				className={STEP_BUTTON}
				aria-label={t('dashboard.period.NEXT')}
				onClick={() => onChange(shiftPeriod(value, 1))}
			>
				<ChevronRight />
			</button>
		</div>
	);
}

function triggerLabelOf(
	activePreset: PeriodPresetKey | null,
	periodText: string,
	t: ReturnType<typeof useTranslations>
) {
	if (activePreset) {
		return t(PRESET_LABEL_KEYS[activePreset]);
	}
	return periodText;
}
