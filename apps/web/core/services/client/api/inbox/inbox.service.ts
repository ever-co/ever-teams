import qs from 'qs';
import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IInboxCounts,
	IInboxItem,
	IInboxItemPage,
	IInboxMarkAllReadInput,
	IInboxQuery,
	IInboxStateInput
} from '@/core/types/interfaces/common/inbox-item';

/** Below the platform's `limit` maximum of 100; a page the list scrolls through in one go. */
export const INBOX_PAGE_SIZE = 40;

/**
 * Client of the platform inbox (`/inbox/items`): every item filed for the signed-in user — platform notifications,
 * questions and approvals, emails — with the user's own read, archive, snooze and done state. Both transports
 * (this app's `/api/inbox/*` proxies, or the platform directly).
 */
class InboxService extends APIService {
	/** A page of my items, newest first. */
	list = async (query: IInboxQuery, signal?: AbortSignal): Promise<IInboxItemPage> => {
		const search = qs.stringify(
			{
				tab: query.tab,
				kind: query.kind,
				source: query.source,
				unread: typeof query.unread === 'boolean' ? String(query.unread) : undefined,
				q: query.q || undefined,
				cursor: query.cursor,
				limit: query.limit ?? INBOX_PAGE_SIZE
			},
			{ skipNulls: true }
		);
		const response = await this.get<IInboxItemPage>(`/inbox/items?${search}`, { signal });
		return response.data;
	};

	/** My unread and open-decision counts. */
	counts = async (signal?: AbortSignal): Promise<IInboxCounts> => {
		const response = await this.get<IInboxCounts>('/inbox/items/counts', { signal });
		return response.data;
	};

	getItem = async (id: string, signal?: AbortSignal): Promise<IInboxItem> => {
		const response = await this.get<IInboxItem>(`/inbox/items/${encodeURIComponent(id)}`, { signal });
		return response.data;
	};

	/** Read / unread, archive / unarchive, snooze / un-snooze, done / not done of one of my items. */
	setState = async (id: string, input: IInboxStateInput): Promise<IInboxItem> => {
		const response = await this.patch<IInboxItem>(`/inbox/items/${encodeURIComponent(id)}/state`, { ...input });
		return response.data;
	};

	/** Marks every unread item of mine (of a tab, and of the filters stated) read. */
	markAllRead = async (input: IInboxMarkAllReadInput = {}): Promise<{ updated: number }> => {
		const response = await this.post<{ updated: number }>('/inbox/items/mark-all-read', { ...input }, undefined, false);
		return response.data;
	};
}

export const inboxService = new InboxService(GAUZY_API_BASE_SERVER_URL.value);
