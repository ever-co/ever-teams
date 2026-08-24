export type RawGauzyRequest = { method?: string; resourceType?: string; url: string };
export type NormalizedGauzyRequest = {
	method: string;
	path: string;
	query: string;
	key: string;
	routeKey: string;
	richGlobalRead: boolean;
};

export function isRichGlobalRead(method: string, path: string): boolean;
export function normalizeGauzyRequest(
	request: RawGauzyRequest,
	options?: { apiOrigins?: string[] }
): NormalizedGauzyRequest | null;
