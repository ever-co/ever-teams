import * as React from 'react';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import { DayPicker, CaptionProps, useNavigation } from 'react-day-picker';

import { cn } from '@/core/lib/helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

const YEARS_AROUND = 10;

const generateYears = (): number[] => {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: YEARS_AROUND * 2 + 1 }, (_, i) => currentYear - YEARS_AROUND + i);
};

const CustomSelectItem = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof SelectItem>>(
	({ className, ...props }, ref) => (
		<SelectItem
			ref={ref}
			chevronClass="hidden"
			className={cn('px-2 focus:bg-foreground/5 focus:text-foreground', className)}
			{...props}
		/>
	)
);
CustomSelectItem.displayName = 'CustomSelectItem';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** The day grid: the picked day filled with the brand colour, today tinted, the weekend columns on a faint band. */
export const compactCalendarClassNames = {
	months: 'flex flex-col gap-2 sm:flex-row',
	month: 'space-y-2',
	head_cell: 'w-8 flex-1 py-1 text-center text-[11px] font-medium capitalize text-muted-foreground',
	day: 'relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg p-0 text-[13px] font-normal tabular-nums text-foreground outline-none transition-[background-color,color,box-shadow] hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-selected:opacity-100'
} as const;

const WEEKEND_BAND = cn(
	'[&_tr>*:nth-child(n+6)]:bg-foreground/[0.03]',
	'[&_thead_tr>*:nth-child(6)]:rounded-tl-lg [&_thead_tr>*:nth-child(7)]:rounded-tr-lg',
	'[&_tbody_tr:last-child>*:nth-child(6)]:rounded-bl-lg [&_tbody_tr:last-child>*:nth-child(7)]:rounded-br-lg'
);

const PICKED_DAY = cn(
	'bg-primary font-semibold aria-selected:text-primary-foreground',
	'hover:bg-primary/90 focus-visible:bg-primary/90'
);

const TODAY = cn(
	'font-semibold',
	'[&:not([aria-selected=true])]:bg-primary/[0.08] [&:not([aria-selected=true])]:text-primary-ink'
);

const STEP_BUTTON =
	'flex h-7 items-center justify-center rounded-md px-1.5 text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4';

const CAPTION_TRIGGER =
	'h-8 w-auto shrink-0 gap-1 rounded-md bg-transparent px-1.5 shadow-none ring-0 hover:bg-foreground/[0.05] dark:bg-transparent';

interface CustomCaptionProps extends CaptionProps {
	onMonthChange?: (date: Date) => void;
}

interface CalendarWords {
	today: string;
	previousMonth: string;
	nextMonth: string;
	month: string;
	year: string;
}

/**
 * The page's language. The words below come from the platform's `Intl` rather than next-intl, so this primitive
 * loads anywhere next-intl's ESM build cannot (its unit test imports it as is).
 */
function pageLocale() {
	if (typeof document === 'undefined') {
		return 'en';
	}
	return document.documentElement.lang || 'en';
}

function capitalized(text: string, locale: string) {
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

function fieldNameOf(locale: string, field: 'month' | 'year') {
	try {
		const names = new Intl.DisplayNames(locale, { type: 'dateTimeField' });
		return names.of(field) ?? field;
	} catch {
		return field;
	}
}

function calendarWordsOf(locale: string): CalendarWords {
	const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	return {
		today: capitalized(relative.format(0, 'day'), locale),
		previousMonth: capitalized(relative.format(-1, 'month'), locale),
		nextMonth: capitalized(relative.format(1, 'month'), locale),
		month: capitalized(fieldNameOf(locale, 'month'), locale),
		year: capitalized(fieldNameOf(locale, 'year'), locale)
	};
}

function monthOf(displayMonth: Date, monthIndex: number) {
	const date = new Date(displayMonth);
	date.setDate(1);
	date.setMonth(monthIndex);
	return date;
}

function yearOf(displayMonth: Date, year: number) {
	const date = new Date(displayMonth);
	date.setDate(1);
	date.setFullYear(year);
	return date;
}

/** Month and year as two quiet menus, then "‹ Today ›" in one outlined group, as the calendar references step. */
function CustomCaption({ displayMonth, onMonthChange }: CustomCaptionProps) {
	const locale = pageLocale();
	const words = React.useMemo(() => calendarWordsOf(locale), [locale]);
	const monthFormat = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long' }), [locale]);
	const { goToMonth, nextMonth, previousMonth } = useNavigation();
	const years = generateYears();
	const shownMonth = displayMonth.getMonth();
	const shownYear = displayMonth.getFullYear();

	const show = (date: Date) => {
		goToMonth(date);
		onMonthChange?.(date);
	};

	const handleMonthChange = (value: string) => {
		const monthIndex = Number.parseInt(value, 10);
		if (Number.isNaN(monthIndex)) {
			return;
		}
		show(monthOf(displayMonth, monthIndex));
	};

	const handleYearChange = (value: string) => {
		const year = Number.parseInt(value, 10);
		if (Number.isNaN(year)) {
			return;
		}
		show(yearOf(displayMonth, year));
	};

	const showPrevious = () => {
		if (previousMonth) {
			show(previousMonth);
		}
	};

	const showNext = () => {
		if (nextMonth) {
			show(nextMonth);
		}
	};

	const monthName = (monthIndex: number) => monthFormat.format(new Date(shownYear, monthIndex, 1));

	return (
		<div className="flex items-center justify-between gap-2 pb-1">
			<div className="flex min-w-0 items-center">
				<Select value={String(shownMonth)} onValueChange={handleMonthChange}>
					<SelectTrigger
						aria-label={words.month}
						className={cn(CAPTION_TRIGGER, 'text-[15px] font-semibold capitalize text-foreground')}
					>
						<SelectValue>{monthName(shownMonth)}</SelectValue>
					</SelectTrigger>
					<SelectContent position="popper" sideOffset={4} className="max-h-[240px] overflow-y-auto">
						{MONTH_INDEXES.map((monthIndex) => (
							<CustomSelectItem
								key={monthIndex}
								value={String(monthIndex)}
								className={cn(
									'cursor-pointer text-sm capitalize transition-colors hover:bg-foreground/5',
									shownMonth === monthIndex && 'bg-foreground/5 font-medium'
								)}
							>
								{monthName(monthIndex)}
							</CustomSelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={String(shownYear)} onValueChange={handleYearChange}>
					<SelectTrigger
						aria-label={words.year}
						className={cn(CAPTION_TRIGGER, 'text-[15px] font-medium tabular-nums text-muted-foreground')}
					>
						<SelectValue>{shownYear}</SelectValue>
					</SelectTrigger>
					<SelectContent position="popper" sideOffset={4} className="max-h-[240px] overflow-y-auto">
						{years.map((year) => (
							<CustomSelectItem
								key={year}
								value={String(year)}
								className={cn(
									'cursor-pointer text-sm tabular-nums transition-colors hover:bg-foreground/5',
									shownYear === year && 'bg-foreground/5 font-medium'
								)}
							>
								{year}
							</CustomSelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex shrink-0 items-center gap-px rounded-lg bg-card p-0.5 hairline-ring ring-border">
				<button
					type="button"
					onClick={showPrevious}
					disabled={!previousMonth}
					aria-label={words.previousMonth}
					className={STEP_BUTTON}
				>
					<ChevronLeft aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => show(new Date())}
					className={cn(STEP_BUTTON, 'px-2 text-xs font-medium text-foreground')}
				>
					{words.today}
				</button>
				<button
					type="button"
					onClick={showNext}
					disabled={!nextMonth}
					aria-label={words.nextMonth}
					className={STEP_BUTTON}
				>
					<ChevronRight aria-hidden="true" />
				</button>
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
	formatters,
	...props
}: CalendarProps & { onMonthChange?: (date: Date) => void }) {
	const locale = pageLocale();
	const weekdayFormat = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
	const formatWeekdayName = React.useCallback((day: Date) => weekdayFormat.format(day), [weekdayFormat]);
	return (
		<DayPicker
			weekStartsOn={1} // Start week on Monday
			showOutsideDays={showOutsideDays}
			captionLayout={captionLayout}
			className={cn('p-3 bg-card rounded-lg', className)}
			formatters={{ formatWeekdayName, ...formatters }}
			classNames={{
				months: compactCalendarClassNames.months,
				month: compactCalendarClassNames.month,
				caption: 'flex justify-between pt-1 relative items-center px-2',
				caption_label: 'text-sm font-medium text-foreground',
				table: cn('w-full border-collapse', WEEKEND_BAND),
				head_row: 'flex w-full',
				head_cell: compactCalendarClassNames.head_cell,
				row: 'flex w-full',
				cell: 'relative flex-1 p-0 py-0.5 text-center text-sm focus-within:relative focus-within:z-20',
				day: compactCalendarClassNames.day,
				day_selected: PICKED_DAY,
				day_today: TODAY,
				day_outside: 'text-muted-foreground/50',
				day_disabled: 'text-muted-foreground/40 hover:bg-transparent',
				day_hidden: 'invisible',
				...classNames
			}}
			components={{
				Caption: (captionProps) => <CustomCaption {...captionProps} onMonthChange={onMonthChange} />
			}}
			{...props}
		/>
	);
}

Calendar.displayName = 'Calendar';

export { Calendar };
