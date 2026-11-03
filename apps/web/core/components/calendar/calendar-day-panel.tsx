'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	floatingSheetSurface,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '@/core/components/common/sheet';
import { cn } from '@/core/lib/helpers';
import type { CalendarDay } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import type { EntryHandlers } from './calendar-entry-parts';
import { DayDetails, DaySummary } from './calendar-day-details';

function useDayTitle(day: CalendarDay, formatters: TimesheetFormatters) {
	const t = useTranslations();
	const weekday = formatters.weekdayShort(day.date);
	const dayDate = formatters.dayDate(day.date);
	return t('dashboard.timesheets.DAY_LABEL', { day: weekday, date: dayDate });
}

function DayPanelBody({
	day,
	formatters,
	handlers,
	onAddTime
}: Readonly<{
	day: CalendarDay;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	onAddTime: (start: Date) => void;
}>) {
	const title = useDayTitle(day, formatters);
	return (
		<>
			<SheetHeader className="hairline-b border-border px-5 pt-5 pb-4 text-left">
				<SheetTitle className="text-base">{title}</SheetTitle>
				<SheetDescription render={<div />}>
					<DaySummary day={day} />
				</SheetDescription>
			</SheetHeader>
			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				<DayDetails day={day} formatters={formatters} handlers={handlers} onAddTime={onAddTime} />
			</div>
		</>
	);
}

/** The day a month cell opens, beside the grid. A closed panel keeps its last day so its exit still shows it. */
export function CalendarDayPanel({
	day,
	formatters,
	handlers,
	onClose,
	onAddTime
}: Readonly<{
	day: CalendarDay | null;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	onClose: () => void;
	onAddTime: (start: Date) => void;
}>) {
	const [shownDay, setShownDay] = useState(day);
	const isOpen = day !== null;
	const isNewDay = isOpen && day !== shownDay;
	if (isNewDay) {
		setShownDay(day);
	}
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			onClose();
		}
	};
	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className={cn(floatingSheetSurface, 'w-[calc(100%-1rem)] sm:w-[26rem]')}>
				{shownDay && (
					<DayPanelBody day={shownDay} formatters={formatters} handlers={handlers} onAddTime={onAddTime} />
				)}
			</SheetContent>
		</Sheet>
	);
}
