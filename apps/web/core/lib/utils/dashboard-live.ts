import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';

/** A report that shows today follows the time being tracked: one read a minute while the tab is visible. */
const LIVE_REFRESH_INTERVAL_MS = 60_000;
const LIVE_STALE_TIME_MS = 30_000;

/** Whether today falls inside a period given as local day keys (`2026-11-03`), the form the report hooks hold. */
export function isLiveDayRange(startKey: string | undefined, endKey: string | undefined, now = new Date()) {
	if (!startKey || !endKey) {
		return false;
	}
	const todayKey = localDayKeyOf(now);
	const startsBeforeToday = startKey.slice(0, 10) <= todayKey;
	const endsAfterToday = endKey.slice(0, 10) >= todayKey;
	return startsBeforeToday && endsAfterToday;
}

export interface LiveQueryOptions {
	refetchInterval?: number;
	refetchIntervalInBackground?: boolean;
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
}

/** Query options to spread after a report query's own: they shorten its freshness only while it shows today. */
export function liveQueryOptionsOf(isLive: boolean): LiveQueryOptions {
	if (!isLive) {
		return {};
	}
	return {
		refetchInterval: LIVE_REFRESH_INTERVAL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		staleTime: LIVE_STALE_TIME_MS
	};
}
