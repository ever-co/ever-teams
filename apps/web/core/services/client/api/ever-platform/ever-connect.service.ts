import { APIService } from '../../api.service';
import { scopedReadConfig, type ScopedReadOptions } from '../../api-request-scope';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IEverConnectEntitlement,
	IEverConnectHealth,
	IEverConnectIntegration,
	IEverConnectLink,
	IEverConnectStatus
} from '@/core/types/interfaces/ever-platform/ever-platform';

/**
 * The organization-level Ever Platform routes of the paired API (`/api/ever-connect/*`), called with
 * the signed-in person's own token. Directly when the browser knows the API, otherwise through this
 * app's allow-listed /api/ever-connect proxy. The browser never talks to an Ever Platform host.
 */

type ErrorWithStatus = { statusCode?: number; status?: number; response?: { status?: number } } | null;

const statusOf = (error: unknown): number | undefined => {
	const candidate = error as ErrorWithStatus;
	return candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status;
};

const orgQuery = (organizationId?: string | null) =>
	organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';

class EverConnectService extends APIService {
	/**
	 * `{connected}` from the paired API, or `null` when it has no Ever Platform module for this web app
	 * (404) or does not accept this person (401): either way the connection parts stay hidden.
	 */
	health = async (options: ScopedReadOptions): Promise<IEverConnectHealth | null> => {
		try {
			const response = await this.get<IEverConnectHealth>('/ever-connect/health', scopedReadConfig(options));
			return response.data && typeof response.data.connected === 'boolean' ? response.data : null;
		} catch (error) {
			const status = statusOf(error);
			if (status === 404 || status === 401 || status === 403) return null;
			throw error;
		}
	};

	status = async (organizationId: string | null | undefined, options: ScopedReadOptions) =>
		(await this.get<IEverConnectStatus>(`/ever-connect/status${orgQuery(organizationId)}`, scopedReadConfig(options)))
			.data;

	integrations = async (organizationId: string | null | undefined, options: ScopedReadOptions) =>
		(
			await this.get<IEverConnectIntegration[]>(
				`/ever-connect/integrations${orgQuery(organizationId)}`,
				scopedReadConfig(options)
			)
		).data;

	entitlement = async (organizationId: string | null | undefined, options: ScopedReadOptions) =>
		(
			await this.get<IEverConnectEntitlement>(
				`/ever-connect/entitlement${orgQuery(organizationId)}`,
				scopedReadConfig(options)
			)
		).data;

	/** Re-reads the states from Ever Platform (on return from app.ever.co). */
	refreshIntegrations = async (organizationId: string | null | undefined) =>
		(
			await this.post<IEverConnectIntegration[]>(
				`/ever-connect/integrations/refresh${orgQuery(organizationId)}`,
				{},
				undefined,
				false
			)
		).data;

	/** The app.ever.co consent link of one integration (the paired API builds it; no token or e-mail in it). */
	consentUrl = async (key: string, organizationId: string | null | undefined) =>
		(
			await this.post<{ url: string; expires_at: string }>(
				`/ever-connect/integrations/${encodeURIComponent(key)}/consent-url${orgQuery(organizationId)}`,
				{},
				undefined,
				false
			)
		).data;

	/** Switches one integration off (switching on happens through consent). */
	disableIntegration = async (key: string, organizationId: string | null | undefined) =>
		(
			await this.put<IEverConnectIntegration>(
				`/ever-connect/integrations/${encodeURIComponent(key)}${orgQuery(organizationId)}`,
				{ enabled: false }
			)
		).data;

	refreshEntitlement = async (organizationId: string | null | undefined) =>
		(
			await this.post<IEverConnectEntitlement>(
				`/ever-connect/entitlement/refresh${orgQuery(organizationId)}`,
				{},
				undefined,
				false
			)
		).data;

	addLink = async (linkCode: string, organizationId: string | null | undefined) =>
		(
			await this.post<IEverConnectLink>(
				`/ever-connect/links${orgQuery(organizationId)}`,
				{ link_code: linkCode },
				undefined,
				false
			)
		).data;

	removeLink = async (integrationTenantId: string, organizationId: string | null | undefined) => {
		await this.delete(`/ever-connect/links/${encodeURIComponent(integrationTenantId)}${orgQuery(organizationId)}`);
	};
}

export const everConnectService = new EverConnectService(GAUZY_API_BASE_SERVER_URL.value);
