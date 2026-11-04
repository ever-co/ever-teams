'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { ExternalLink } from '@/core/components/icons';
import { siteAddressOf } from '@/core/components/activities/activity-links';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { formatDurationShort, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import { TDailyActivity } from '@/core/types/schemas';

/** Share, name over its visit, a thin meter from a 28rem row, the time spent: the row lays out from its own width. */
export const VISITED_ROW_GRID =
	'grid min-h-11 grid-cols-[2.75rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 py-2 @md:grid-cols-[2.75rem_minmax(0,1fr)_minmax(4rem,9rem)_4.5rem]';

export const VISITED_ROW_METER = '@max-md:hidden';

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})/;

const SECONDS_PER_MINUTE = 60;

const VISIT_SEPARATOR = ' · ';

interface VisitFormats {
	calendarDay: Intl.DateTimeFormat;
	clock: Intl.DateTimeFormat;
}

function visitFormatsOf(locale: string): VisitFormats {
	const dayOptions: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
	return {
		calendarDay: new Intl.DateTimeFormat(locale, { ...dayOptions, timeZone: 'UTC' }),
		clock: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
	};
}

/** Under a minute the seconds read better than `0h 0m`. */
export function formatUsageDuration(seconds: number) {
	const wholeSeconds = Math.round(seconds);
	if (wholeSeconds < SECONDS_PER_MINUTE) {
		return `${wholeSeconds}s`;
	}
	return formatDurationShort(wholeSeconds);
}

/**
 * Gauzy sends the UTC calendar day of a visit as a date-only value or as UTC midnight, depending on the ORM:
 * read as that day, it never shows as the day before west of Greenwich.
 */
function visitDayTextOf(date: string | null | undefined, formats: VisitFormats) {
	if (!date) {
		return '';
	}
	const parsed = new Date(date);
	const time = parsed.getTime();
	if (Number.isNaN(time)) {
		return '';
	}
	const visitDay = getDailyPlanDay(date);
	const visitDayAtUtcMidnight = new Date(visitDay);
	return formats.calendarDay.format(visitDayAtUtcMidnight);
}

function visitClockTextOf(time: string | null | undefined, formats: VisitFormats) {
	if (!time) {
		return '';
	}
	const match = CLOCK_PATTERN.exec(time);
	if (!match) {
		return time;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const clock = new Date();
	clock.setHours(hours, minutes, 0, 0);
	return formats.clock.format(clock);
}

function visitTextOf(app: TDailyActivity, formats: VisitFormats) {
	const dayText = visitDayTextOf(app?.date, formats);
	const clockText = visitClockTextOf(app?.time, formats);
	const parts = [dayText, clockText];
	const shownParts = parts.filter(Boolean);
	return shownParts.join(VISIT_SEPARATOR);
}

function activitySecondsOf(app: TDailyActivity) {
	if (!app?.duration) {
		return 0;
	}
	return Number(app.duration);
}

/** Only the page data of a visited site carries a url: metaData can also be a string (SQLite) or an array (agent rows). */
function recordedUrlOf(app: TDailyActivity) {
	const metaData = app?.metaData;
	const isObject = typeof metaData === 'object' && metaData !== null;
	if (!isObject || Array.isArray(metaData)) {
		return undefined;
	}
	const { url } = metaData as { url?: unknown };
	if (typeof url !== 'string') {
		return undefined;
	}
	return url;
}

function siteAddressOfActivity(app: TDailyActivity) {
	const recordedUrl = recordedUrlOf(app);
	const recordedAddress = siteAddressOf(recordedUrl);
	if (recordedAddress) {
		return recordedAddress;
	}
	return siteAddressOf(app?.title);
}

function ActivityName({ app, isSite }: Readonly<{ app: TDailyActivity; isSite: boolean }>) {
	const t = useTranslations();
	const title = app?.title;
	const address = siteAddressOfActivity(app);
	const isLinkedSite = isSite && Boolean(address);
	if (!isLinkedSite) {
		return <span className="truncate text-[13px] font-medium text-foreground">{title}</span>;
	}
	return (
		<a
			href={address ?? undefined}
			target="_blank"
			rel="noopener noreferrer"
			className="flex min-w-0 items-center gap-1 self-start rounded-sm text-[13px] font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<span className="truncate">{title}</span>
			<ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
			<span className="sr-only">, {t('pages.teamTasks.OPEN_IN_NEW_TAB')}</span>
		</a>
	);
}

/** One app or site of an hour, ranked by its share of that hour (timer-16's app rows, read as text first). */
const VisitedItem = ({
	app,
	totalMilliseconds,
	type
}: {
	app: TDailyActivity;
	totalMilliseconds: number;
	type: string;
}) => {
	const locale = useLocale();
	const formats = useMemo(() => visitFormatsOf(locale), [locale]);
	const seconds = activitySecondsOf(app);
	const share = percentOf(seconds, totalMilliseconds);
	const shareText = formatPercent(share, locale);
	const durationText = formatUsageDuration(seconds);
	const visitText = visitTextOf(app, formats);
	const isSite = type === 'SITE';

	return (
		<div className="@container">
			<div className={VISITED_ROW_GRID}>
				<span className="text-[13px] tabular-nums text-muted-foreground">{shareText}</span>
				<span className="flex min-w-0 flex-col">
					<ActivityName app={app} isSite={isSite} />
					{visitText && <span className="truncate text-xs text-muted-foreground">{visitText}</span>}
				</span>
				<ShareMeter share={share} className={VISITED_ROW_METER} />
				<span className="text-right text-[13px] font-medium tabular-nums text-foreground">{durationText}</span>
			</div>
		</div>
	);
};

export default VisitedItem;
