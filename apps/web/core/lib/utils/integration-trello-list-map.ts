import { matchStatusName, type LinearStatusOption } from '@/core/lib/utils/integration-linear-state-map';
import type { ITrelloList } from '@/core/types/interfaces/integrations/trello';

/** The value of a list field that leaves the list to its name (selects cannot hold an empty value). */
export const LIST_BY_NAME = '__by_name__';

/** The form's value of a list: the stored status, or "by name" when the map leaves the list out. */
export function listFieldValue(listMap: Record<string, string>, listId: string): string {
	const value = listMap[listId];
	return typeof value === 'string' && value.trim() ? value : LIST_BY_NAME;
}

/** The map the platform stores from the form's fields: only the lists given a status. */
export function listMapOfFields(fields: Record<string, string>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [id, value] of Object.entries(fields)) {
		const status = value === LIST_BY_NAME ? '' : value.trim();
		if (id && status) map[id] = status;
	}
	return map;
}

/** The form's fields for a board's lists and a stored map (lists the map names but the board lost are left out). */
export function listFieldsOf(lists: readonly ITrelloList[], listMap: Record<string, string>): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const list of lists) fields[list.id] = listFieldValue(listMap, list.id);
	return fields;
}

/** The lists whose chosen status names no status of the project or the organization (a value left to the name is always fine). */
export function invalidListFields(fields: Record<string, string>, options: readonly LinearStatusOption[]): string[] {
	return Object.entries(fields)
		.filter(([, value]) => value !== LIST_BY_NAME && !matchStatusName(value, options))
		.map(([id]) => id);
}

/** The token Trello put in the address's fragment on return (`#token=…`, possibly among other pairs), or null. */
export function tokenOfHash(hash: string | null | undefined): string | null {
	if (!hash) return null;
	const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
	const token = params.get('token')?.trim() ?? '';
	return /^[A-Za-z0-9]{1,256}$/.test(token) ? token : null;
}
