'use client';

import { useCallback, useMemo } from 'react';
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
 */
export function useReportUrlFilters() {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const query = params?.toString() ?? '';

	const filters = useMemo(() => {
		const current = new URLSearchParams(query);
		return readReportUrlFilters(current);
	}, [query]);

	const replaceParams = useCallback(
		(change: (next: URLSearchParams) => void) => {
			const next = new URLSearchParams(query);
			change(next);
			const isUnchanged = next.toString() === query;
			if (isUnchanged) {
				return;
			}
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
