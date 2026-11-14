'use client';

import { useAtom } from 'jotai';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { DisplayRow } from '@/core/components/common/display-menu-parts';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { RotateLeft, SlidersHorizontal } from '@/core/components/icons';
import {
	type CalendarGridSettings,
	type CalendarRowHeight,
	DEFAULT_CALENDAR_GRID_SETTINGS,
	ROW_HEIGHT_OPTIONS,
	SNAP_STEP_OPTIONS
} from '@/core/lib/utils/calendar-grid-settings';
import { HOURS_IN_DAY } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { calendarGridSettingsState } from '@/core/stores/calendar/calendar-grid-settings';

const SETTINGS_TRIGGER =
	'relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground outline-none hairline-ring ring-foreground/10 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-muted/50 data-[state=open]:text-foreground dark:bg-foreground/5 [&_svg]:size-4';

const ROW_HEIGHT_KEYS: Record<CalendarRowHeight, DottedLanguageObjectStringPaths> = {
	compact: 'dashboard.calendar.SETTINGS.ROW_COMPACT',
	default: 'dashboard.calendar.SETTINGS.ROW_DEFAULT',
	tall: 'dashboard.calendar.SETTINGS.ROW_TALL'
};

const HOURS = Array.from({ length: HOURS_IN_DAY + 1 }, (_, hour) => hour);

function isDefaultSettings(settings: CalendarGridSettings) {
	const fallback = DEFAULT_CALENDAR_GRID_SETTINGS;
	return (
		settings.snapMinutes === fallback.snapMinutes &&
		settings.firstHour === fallback.firstHour &&
		settings.lastHour === fallback.lastHour &&
		settings.rowHeight === fallback.rowHeight
	);
}

function wholeNumberOf(value: string | null) {
	if (value === null) {
		return null;
	}
	const number = Number(value);
	if (!Number.isInteger(number)) {
		return null;
	}
	return number;
}

/**
 * The Calendar's grid settings, next to the view switch: the step every drag snaps to, the first and the last hour
 * the week and day grids draw, and their row height. Kept in this browser; a dot on the trigger says they differ
 * from the defaults.
 */
export function CalendarGridSettingsMenu({ formatters }: Readonly<{ formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const [settings, setSettings] = useAtom(calendarGridSettingsState);
	const isCustomised = !isDefaultSettings(settings);
	const label = t('dashboard.calendar.SETTINGS.LABEL');

	const hourText = (hour: number) => {
		if (hour === HOURS_IN_DAY) {
			return t('dashboard.calendar.SETTINGS.END_OF_DAY');
		}
		const time = new Date();
		time.setHours(hour, 0, 0, 0);
		return formatters.time(time);
	};

	const change = (next: Partial<CalendarGridSettings>) => setSettings({ ...settings, ...next });

	const changeSnap = (value: string | null) => {
		const minutes = SNAP_STEP_OPTIONS.find((option) => option === wholeNumberOf(value));
		if (minutes) {
			change({ snapMinutes: minutes });
		}
	};
	const changeFirstHour = (value: string | null) => {
		const hour = wholeNumberOf(value);
		if (hour !== null && hour < settings.lastHour) {
			change({ firstHour: hour });
		}
	};
	const changeLastHour = (value: string | null) => {
		const hour = wholeNumberOf(value);
		if (hour !== null && hour > settings.firstHour) {
			change({ lastHour: hour });
		}
	};

	const firstHours = HOURS.filter((hour) => hour < settings.lastHour);
	const lastHours = HOURS.filter((hour) => hour > settings.firstHour);
	const rowHeights = ROW_HEIGHT_OPTIONS.map((rowHeight) => ({
		value: rowHeight,
		label: t(ROW_HEIGHT_KEYS[rowHeight])
	}));

	return (
		<Popover>
			<PopoverTrigger
				render={<button type="button" aria-label={label} title={label} className={SETTINGS_TRIGGER} />}
			>
				<SlidersHorizontal aria-hidden="true" />
				{isCustomised && (
					<span
						aria-hidden="true"
						className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background"
					/>
				)}
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} collisionPadding={12} className="w-80 p-0">
				<p className="px-3 pt-2.5 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
				<div className="pb-1.5">
					<DisplayRow label={t('dashboard.calendar.SETTINGS.SNAP')}>
						<Select value={String(settings.snapMinutes)} onValueChange={changeSnap}>
							<SelectTrigger
								aria-label={t('dashboard.calendar.SETTINGS.SNAP')}
								className="h-7 w-32 text-[13px] tabular-nums"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SNAP_STEP_OPTIONS.map((minutes) => (
									<SelectItem key={minutes} value={String(minutes)}>
										{t('dashboard.calendar.SETTINGS.SNAP_OPTION', { minutes })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</DisplayRow>
					<DisplayRow label={t('dashboard.calendar.SETTINGS.FIRST_HOUR')}>
						<Select value={String(settings.firstHour)} onValueChange={changeFirstHour}>
							<SelectTrigger
								aria-label={t('dashboard.calendar.SETTINGS.FIRST_HOUR')}
								className="h-7 w-32 text-[13px] tabular-nums"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{firstHours.map((hour) => (
									<SelectItem key={hour} value={String(hour)}>
										{hourText(hour)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</DisplayRow>
					<DisplayRow label={t('dashboard.calendar.SETTINGS.LAST_HOUR')}>
						<Select value={String(settings.lastHour)} onValueChange={changeLastHour}>
							<SelectTrigger
								aria-label={t('dashboard.calendar.SETTINGS.LAST_HOUR')}
								className="h-7 w-32 text-[13px] tabular-nums"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{lastHours.map((hour) => (
									<SelectItem key={hour} value={String(hour)}>
										{hourText(hour)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</DisplayRow>
					<p className="px-3 pb-1 text-xs text-muted-foreground">
						{t('dashboard.calendar.SETTINGS.HOURS_HINT')}
					</p>
				</div>
				<div className="flex flex-col gap-2 hairline-t border-border px-3 pt-2.5 pb-3">
					<span className="text-[13px] text-muted-foreground">
						{t('dashboard.calendar.SETTINGS.ROW_HEIGHT')}
					</span>
					<SegmentedControl<CalendarRowHeight>
						items={rowHeights}
						value={settings.rowHeight}
						onValueChange={(rowHeight) => change({ rowHeight })}
						ariaLabel={t('dashboard.calendar.SETTINGS.ROW_HEIGHT')}
						className="w-full [&>button]:flex-1"
					/>
				</div>
				<div className="flex items-center gap-2 hairline-t border-border py-1.5 pr-1.5 pl-3">
					<span className="text-xs text-muted-foreground">{t('dashboard.calendar.SETTINGS.KEPT_HERE')}</span>
					{isCustomised && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSettings(DEFAULT_CALENDAR_GRID_SETTINGS)}
							className="ml-auto"
						>
							<RotateLeft />
							{t('dashboard.calendar.SETTINGS.RESET')}
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
