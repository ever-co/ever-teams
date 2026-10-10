import type { IEverStatsLast, IEverStatsStatus, TEverStatsView } from '@/core/types/interfaces/ever-platform/ever-platform';

/**
 * This web app's own /api/ever-stats routes (never the paired API directly: only these routes add the
 * web app's reporter, and only after the paired API accepted the person as the operator). Same origin,
 * with the session cookies; nothing is cached.
 */

export class EverStatsRequestError extends Error {
	constructor(readonly status: number) {
		super(`The statistics settings answered ${status}.`);
		this.name = 'EverStatsRequestError';
	}
}

async function call(path: string, init?: RequestInit): Promise<Response> {
	return fetch(path, {
		...init,
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}) }
	});
}

const managedByOf = (body: unknown): 'ever_cloud' | 'operator' | null => {
	const value = (body as { managed_by?: unknown } | null)?.managed_by;
	return value === 'ever_cloud' || value === 'operator' ? value : null;
};

export const everStatsService = {
	/**
	 * The operator's view; who manages the statistics when the paired API does not show them to this
	 * person; or `off` when this web app runs without its statistics module (404 with nothing else).
	 */
	async view(signal?: AbortSignal): Promise<TEverStatsView> {
		const response = await call('/api/ever-stats/status', { signal });
		const body = await response.json().catch(() => null);
		if (response.status === 200 && body) return { kind: 'operator', status: body as IEverStatsStatus };
		if (response.status === 404) {
			const managedBy = managedByOf(body);
			return managedBy ? { kind: 'managed', managedBy } : { kind: 'off' };
		}
		throw new EverStatsRequestError(response.status);
	},

	async last(signal?: AbortSignal): Promise<IEverStatsLast | null> {
		const response = await call('/api/ever-stats/last', { signal });
		if (response.status === 404) return null;
		if (response.status !== 200) throw new EverStatsRequestError(response.status);
		return (await response.json()) as IEverStatsLast;
	},

	async setEnabled(enabled: boolean): Promise<IEverStatsStatus> {
		const response = await call('/api/ever-stats/enabled', { method: 'PUT', body: JSON.stringify({ enabled }) });
		if (response.status !== 200) throw new EverStatsRequestError(response.status);
		return (await response.json()) as IEverStatsStatus;
	}
};
