import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import type { RealtimeCatchUp, RealtimeCatchUpQuery, RealtimePresenceStatus } from '@/core/lib/realtime/events';

/** What `GET /realtime/status` answers. */
interface RealtimeStatusAnswer {
	enabled: boolean;
	subscriptions: boolean;
	names: string[];
}

/** Body of `POST /realtime/typing`. */
interface RealtimeTypingInput {
	conversationId: string;
	threadRootId?: string | null;
	/** The users to tell; at most 50. */
	recipientUserIds: string[];
}

/**
 * The HTTP side of the real-time channel: the catch-up listing a reconnecting tab replays from, and the
 * presence and typing signals. Both transports (this app's `/api/realtime/*` proxies, or the platform directly).
 */
class RealtimeService extends APIService {
	status = async (): Promise<RealtimeStatusAnswer> => {
		const response = await this.get<RealtimeStatusAnswer>('/realtime/status');
		return response.data;
	};

	catchUp = async (query: RealtimeCatchUpQuery): Promise<RealtimeCatchUp> => {
		const params: Record<string, string> = {};
		if (typeof query.after === 'number') params.after = String(Math.trunc(query.after));
		if (query.afterId) params.afterId = query.afterId;
		if (typeof query.limit === 'number') params.limit = String(query.limit);
		const response = await this.get<RealtimeCatchUp>('/realtime/events', { params });
		return response.data;
	};

	presence = async (status: RealtimePresenceStatus): Promise<unknown> => {
		// The platform's own DTOs: no tenant or organization members in the body (the token and headers say them).
		const response = await this.post<unknown>('/realtime/presence', { status }, undefined, false);
		return response.data;
	};

	/**
	 * The presence a closing page reports: a `keepalive` fetch, which the browser lets outlive the page (an Axios
	 * request is cancelled with it), with the credential and scope the app's requests carry. Fire and forget.
	 */
	presenceOnUnload = (status: RealtimePresenceStatus): void => {
		if (typeof fetch !== 'function') return;
		const base = String(this.axiosInstance.defaults.baseURL ?? this.baseURL ?? '').replace(/\/+$/, '');
		const token = getAccessTokenCookie();
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (token) headers['Authorization'] = `Bearer ${token}`;
		if (tenantId) headers['tenant-id'] = tenantId;
		if (organizationId) headers['organization-id'] = organizationId;
		void fetch(`${base}/realtime/presence`, {
			method: 'POST',
			keepalive: true,
			credentials: 'include',
			headers,
			body: JSON.stringify({ status })
		}).catch(() => undefined);
	};

	typing = async (input: RealtimeTypingInput): Promise<unknown> => {
		const response = await this.post<unknown>('/realtime/typing', { ...input }, undefined, false);
		return response.data;
	};
}

export const realtimeService = new RealtimeService(GAUZY_API_BASE_SERVER_URL.value);
