import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { isHistoryUnsupportedStatus } from '@/core/lib/utils/time-log-history';
import type {
	ETimeLogChangeKind,
	ITimeLogHistoryPage,
	ITimeLogHistoryRow
} from '@/core/types/interfaces/timer/time-log/time-log-history';

/** A history read: the rows, or `unsupported` when the API has no history routes (the pages then behave as before). */
export type HistoryRead<T> = { kind: 'ready'; value: T } | { kind: 'unsupported' };

export interface PeriodHistoryRange {
	from: Date;
	to: Date;
	employeeIds?: ReadonlyArray<string>;
	kinds?: ReadonlyArray<ETimeLogChangeKind>;
}

/** Gauzy answers at most 500 rows a page. */
const PAGE_SIZE = 500;

/** A period rarely holds more than a few pages of changes; this keeps a runaway read bounded. */
const MAX_PAGES = 10;

function listOrUndefined(values: ReadonlyArray<string> | undefined) {
	const hasValues = Boolean(values) && (values?.length ?? 0) > 0;
	if (!hasValues) {
		return undefined;
	}
	return [...(values ?? [])];
}

function unsupportedOrThrow(error: unknown): { kind: 'unsupported' } {
	const status = errorStatusOf(error) ?? undefined;
	if (isHistoryUnsupportedStatus(status)) {
		return { kind: 'unsupported' };
	}
	throw error;
}

class TimeLogHistoryService extends APIService {
	/** The history of one entry, newest first. */
	getEntryHistory = async (entryId: string): Promise<HistoryRead<ITimeLogHistoryRow[]>> => {
		const query = qs.stringify({ tenantId: this.tenantId, organizationId: this.organizationId });
		const path = `/timesheet/time-log/${encodeURIComponent(entryId)}/history?${query}`;
		try {
			const response = await this.get<ITimeLogHistoryRow[]>(path, { tenantId: this.tenantId });
			return { kind: 'ready', value: response.data ?? [] };
		} catch (error) {
			return unsupportedOrThrow(error);
		}
	};

	/** The changes recorded over a period on the entries of some members (every page). */
	getPeriodHistory = async (range: PeriodHistoryRange): Promise<HistoryRead<ITimeLogHistoryRow[]>> => {
		const rows: ITimeLogHistoryRow[] = [];
		try {
			for (let page = 1; page <= MAX_PAGES; page++) {
				const query = qs.stringify({
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					startDate: range.from.toISOString(),
					endDate: range.to.toISOString(),
					employeeIds: listOrUndefined(range.employeeIds),
					kinds: listOrUndefined(range.kinds),
					take: PAGE_SIZE,
					skip: page
				});
				const response = await this.get<ITimeLogHistoryPage>(`/timesheet/time-log/history?${query}`, {
					tenantId: this.tenantId
				});
				const items = response.data?.items ?? [];
				rows.push(...items);
				const total = response.data?.total ?? rows.length;
				const isLastPage = items.length < PAGE_SIZE || rows.length >= total;
				if (isLastPage) {
					break;
				}
			}
		} catch (error) {
			return unsupportedOrThrow(error);
		}
		return { kind: 'ready', value: rows };
	};
}

export const timeLogHistoryService = new TimeLogHistoryService(GAUZY_API_BASE_SERVER_URL.value);
