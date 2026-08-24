import { useQuery } from '@tanstack/react-query';
import moment from 'moment-timezone';
import { queryKeys } from '@/core/query/keys';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import type { TProfileActivityRequest } from '@/core/types/schemas/activities/profile-activity.schema';

export type ProfileActivityDateRange = Pick<TProfileActivityRequest, 'startDate' | 'endDate'>;

export type UseProfileActivityOptions = {
	enabled?: boolean;
};

function recognizedTimeZone(value: string | null | undefined): string | null {
	if (!value) return null;

	const withoutOffset = value.split('(')[0].trim();
	const candidate = withoutOffset.replace(/\s+/g, '_');
	return moment.tz.zone(candidate)?.name ?? null;
}

export function normalizeProfileActivityTimeZone(
	configuredTimeZone?: string | null,
	browserTimeZone?: string | null
): string {
	const configured = recognizedTimeZone(configuredTimeZone);
	if (configured) return configured;

	let detected = browserTimeZone;
	if (detected === undefined) {
		try {
			detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			detected = null;
		}
	}

	return recognizedTimeZone(detected) ?? 'UTC';
}

export function getProfileActivityMonthRange(timeZone: string, referenceDate = new Date()): ProfileActivityDateRange {
	const start = moment(referenceDate).tz(timeZone).startOf('month');

	return {
		startDate: start.format('YYYY-MM-DD'),
		endDate: start.clone().add(1, 'month').format('YYYY-MM-DD')
	};
}

export function getProfileActivityYearRange(timeZone: string, year: number): ProfileActivityDateRange {
	const start = moment.tz(`${year}-01-01`, 'YYYY-MM-DD', true, timeZone);

	return {
		startDate: start.format('YYYY-MM-DD'),
		endDate: start.clone().add(1, 'year').format('YYYY-MM-DD')
	};
}

export function useProfileActivity(
	request: TProfileActivityRequest | null | undefined,
	{ enabled = true }: UseProfileActivityOptions = {}
) {
	return useQuery({
		queryKey: request
			? queryKeys.profileActivity.byScope(request)
			: (['profile-activity', null, null, null, null, null, null, null, false] as const),
		queryFn: ({ signal }) => statisticsService.getProfileActivity(request!, signal),
		enabled: enabled && request !== null && request !== undefined,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: false
	});
}
