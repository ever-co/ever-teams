import { LINEAR_STATE_KINDS, TLinearStateKind } from '@/core/types/interfaces/integrations/linear';

/** A task status a kind of Linear state may become: the project's own or the organization's, by name. */
export interface LinearStatusOption {
	name: string;
}

/** The task status each kind of Linear state becomes unless the mapping says otherwise (the platform's own defaults). */
export const FALLBACK_STATE_MAP: Record<TLinearStateKind, string> = {
	triage: 'open',
	backlog: 'backlog',
	unstarted: 'open',
	started: 'in-progress',
	completed: 'completed',
	canceled: 'cancelled'
};

/** The map a mapping works with: the platform's defaults under the mapping's own entries. */
export function effectiveStateMap(defaults: Record<string, string>, stored: Record<string, string> | null | undefined): Record<TLinearStateKind, string> {
	const map = { ...FALLBACK_STATE_MAP };
	for (const kind of LINEAR_STATE_KINDS) {
		const value = stored?.[kind] ?? defaults[kind];
		if (typeof value === 'string' && value.trim()) map[kind] = value;
	}
	return map;
}

function normalize(value: string | null | undefined): string {
	return String(value ?? '')
		.trim()
		.toLowerCase();
}

/** The option a value names, whatever its case (the platform matches statuses by name, case ignored). */
export function matchStatusName(value: string | null | undefined, options: readonly LinearStatusOption[]): LinearStatusOption | null {
	const wanted = normalize(value);
	if (!wanted) return null;
	return options.find((option) => normalize(option.name) === wanted) ?? null;
}

/** The kinds whose value names no status: saved, such a value would leave every imported task of that kind without a status row. */
export function invalidStateMapKinds(stateMap: Record<string, string>, options: readonly LinearStatusOption[]): TLinearStateKind[] {
	return LINEAR_STATE_KINDS.filter((kind) => !matchStatusName(stateMap[kind], options));
}
