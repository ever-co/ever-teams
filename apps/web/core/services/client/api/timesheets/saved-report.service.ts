import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type {
	IPublicSavedReport,
	ISavedReport,
	ISavedReportCreateInput,
	ISavedReportShareInput,
	ISavedReportShareResponse,
	ISavedReportUpdateInput
} from '@/core/types/interfaces/timesheet/saved-report';
import { APIService } from '../../api.service';

function reportPathOf(id: string) {
	return `/saved-reports/${encodeURIComponent(id)}`;
}

/** The most reports Gauzy answers in one page of the list (its `MAX_SAVED_REPORTS_PER_PAGE`). */
const SAVED_REPORTS_PAGE_SIZE = 200;

/** An id no saved report has: the nil uuid, which no database generates for a row. */
const NO_REPORT_ID = '00000000-0000-0000-0000-000000000000';

const NOT_FOUND = 404;
const BAD_REQUEST = 400;

const GROUPING_PROPERTY = /\bgrouping\b/i;

function messageTextOf(message: unknown): string {
	if (Array.isArray(message)) {
		return message.join(' ');
	}
	if (typeof message === 'string') {
		return message;
	}
	return '';
}

/** Whether a refusal is an older Gauzy's of the Label grouping: a 400 that names the `grouping` property. */
function isRefusalOfLabelGrouping(error: unknown): boolean {
	if (errorStatusOf(error) !== BAD_REQUEST) {
		return false;
	}
	const failure = error as { message?: unknown; response?: { data?: { message?: unknown } } } | null;
	const message = `${messageTextOf(failure?.message)} ${messageTextOf(failure?.response?.data?.message)}`;
	return GROUPING_PROPERTY.test(message);
}

/**
 * The signed-in member's saved reports (Gauzy `/api/saved-reports`; in proxy mode this app's `/api/saved-reports`
 * twins), and the read of a shared report through its link (`/public/saved-reports/:token`), which needs no session.
 * Every route acts on the caller's own reports only.
 */
class SavedReportService extends APIService {
	private readonly listPage = async (organizationId: string, skip: number) => {
		const query = new URLSearchParams({
			organizationId,
			skip: String(skip),
			take: String(SAVED_REPORTS_PAGE_SIZE)
		});
		const { data } = await this.get<PaginationResponse<ISavedReport>>(`/saved-reports?${query.toString()}`);
		return data;
	};

	/** Every saved report of the caller in the organization, read page after page until the API's total. */
	list = async (organizationId: string): Promise<PaginationResponse<ISavedReport>> => {
		let page = await this.listPage(organizationId, 0);
		const items = [...page.items];
		// A page that brings nothing ends the read, whatever total the API states
		while (page.items.length > 0 && items.length < page.total) {
			page = await this.listPage(organizationId, items.length);
			items.push(...page.items);
		}
		return { items, total: page.total };
	};

	create = async (input: ISavedReportCreateInput): Promise<ISavedReport> => {
		const { data } = await this.post<ISavedReport>('/saved-reports', { ...input }, undefined, false);
		return data;
	};

	update = async (id: string, input: ISavedReportUpdateInput): Promise<ISavedReport> => {
		const { data } = await this.put<ISavedReport>(reportPathOf(id), { ...input });
		return data;
	};

	remove = async (id: string): Promise<void> => {
		await this.delete(reportPathOf(id));
	};

	/** Turns the link on, or replaces it: the token comes back this one time. */
	share = async (id: string, input: ISavedReportShareInput): Promise<ISavedReportShareResponse> => {
		const { data } = await this.post<ISavedReportShareResponse>(
			`${reportPathOf(id)}/share`,
			{ ...input },
			{ secretResponse: true },
			false
		);
		return data;
	};

	/**
	 * Whether Gauzy keeps the labels of entries on a saved report (ever-gauzy#12073): the labels filter (`tagIds`,
	 * `untagged`) and the Label grouping, which came together. Asked with a change of a report that does not exist
	 * ({@link NO_REPORT_ID}) to the Label grouping: Gauzy checks the body before it looks for the report, so one that
	 * keeps labels takes it and answers 404 (no such report), and an older one refuses the grouping with a 400 that names
	 * it. Nothing is written either way. Any other answer is a failure, read again rather than taken as "no labels".
	 */
	keepsEntryLabels = async (): Promise<boolean> => {
		try {
			await this.put<ISavedReport>(reportPathOf(NO_REPORT_ID), { grouping: 'label' });
			return true;
		} catch (error) {
			if (errorStatusOf(error) === NOT_FOUND) {
				return true;
			}
			if (isRefusalOfLabelGrouping(error)) {
				return false;
			}
			throw error;
		}
	};

	/** Turns the link off: it stops working at once. */
	unshare = async (id: string): Promise<void> => {
		await this.delete(`${reportPathOf(id)}/share`);
	};

	/**
	 * A shared report, read through its link without a session. Every link that does not open one answers 404. The
	 * address holds the token that opens the report, so no log writes it (`secretAddress`).
	 */
	readShared = async (token: string): Promise<IPublicSavedReport> => {
		const { data } = await this.get<IPublicSavedReport>(`/public/saved-reports/${encodeURIComponent(token)}`, {
			secretAddress: true
		});
		return data;
	};
}

export const savedReportService = new SavedReportService(GAUZY_API_BASE_SERVER_URL.value);
