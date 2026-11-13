'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	clearReportUrlFilters,
	readReportUrlFilters,
	type ReportUrlFilterField,
	writeReportUrlFilter
} from '@/core/lib/utils/dashboards/report-filters';
import { urlWithParams } from '@/core/lib/utils/project-list';

/**
 * The client, billable and label filters of a report, kept in the page link as the projects list keeps its own
 * (`?clients=<id>,none&billable=true&labels=<id>`): a reload or a shared link opens the same report.
 *
 * The link follows a change a moment after it is asked for. Until then the change is what the page shows, so a
 * picked value is checked at once and the next pick builds on it; once the link has moved, the link is the truth.
 */
export function useReportUrlFilters() {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const linkQuery = params?.toString() ?? '';
	const [awaitedQuery, setAwaitedQuery] = useState<string | null>(null);
	const [lastLinkQuery, setLastLinkQuery] = useState(linkQuery);

	if (linkQuery !== lastLinkQuery) {
		setLastLinkQuery(linkQuery);
		setAwaitedQuery(null);
	}

	const query = awaitedQuery ?? linkQuery;

	const filters = useMemo(() => {
		const current = new URLSearchParams(query);
		return readReportUrlFilters(current);
	}, [query]);

	const replaceParams = useCallback(
		(change: (next: URLSearchParams) => void) => {
			const next = new URLSearchParams(query);
			change(next);
			const nextQuery = next.toString();
			const isUnchanged = nextQuery === query;
			if (isUnchanged) {
				return;
			}
			setAwaitedQuery(nextQuery);
			router.replace(urlWithParams(pathname, next), { scroll: false });
		},
		[pathname, query, router]
	);

	const setFilter = useCallback(
		(field: ReportUrlFilterField, values: string[]) => {
			replaceParams((next) => writeReportUrlFilter(next, field, values));
		},
		[replaceParams]
	);

	const removeFilterValue = useCallback(
		(field: ReportUrlFilterField, value: string) => {
			const remaining = filters[field].filter((current) => current !== value);
			setFilter(field, remaining);
		},
		[filters, setFilter]
	);

	const clearFilters = useCallback(() => {
		replaceParams(clearReportUrlFilters);
	}, [replaceParams]);

	return { filters, setFilter, removeFilterValue, clearFilters };
}
