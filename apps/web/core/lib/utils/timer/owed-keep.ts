/**
 * The Keeps whose writing is not over (#5123). The person kept the time a run went on without the app, and the slots
 * of that time are written one window after the other: a write that fails leaves the rest owed. Each slot written
 * moves the run's heartbeat to the present, so the run no longer shows that anything is missing. What is owed is
 * therefore kept in the storage the browser's tabs share, which a reload keeps too: whichever tab checks the run next
 * writes the rest, once, and a tab that finds it gone knows another one wrote it.
 */

/** A Keep whose writing is not over. Times are on the API's clock unless said otherwise. */
export interface OwedKeep {
	employeeId: string;
	timeLogId: string;
	/** The run's last heartbeat when the person kept the time after it. */
	heartbeat: number;
	/** Where the writing resumes: the end of the last slot written, or the heartbeat while none is. */
	fromMs: number;
	/** The present as the Keep measured it: the time the person kept ends there. */
	toMs: number;
	/** The API's clock less the computer's, as the Keep measured them. */
	apiOffsetMs: number;
	/** When a slot of it was last written, or else when it was kept. */
	writtenAtMs: number;
	/** When it was kept, on the computer's clock. */
	keptAt: number;
}

const KEY_PREFIX = 'ever-teams.timer.owed-keep.';
/** A Keep owed for longer than a day is not written any more: the person has long moved on. */
const OWED_FOR_AT_MOST_MS = 24 * 60 * 60_000;

/** Where a browser that blocks its storage keeps them: this page only. */
const inThisPage = new Map<string, OwedKeep>();

function keyOf(keep: Pick<OwedKeep, 'timeLogId' | 'heartbeat'>): string {
	return `${KEY_PREFIX}${keep.timeLogId}@${keep.heartbeat}`;
}

function browserStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}

function isOwedKeep(value: Partial<OwedKeep> | null): value is OwedKeep {
	const times = [value?.heartbeat, value?.fromMs, value?.toMs, value?.apiOffsetMs, value?.writtenAtMs, value?.keptAt];
	return (
		typeof value?.employeeId === 'string' &&
		typeof value.timeLogId === 'string' &&
		!!value.timeLogId &&
		times.every((time) => typeof time === 'number' && Number.isFinite(time))
	);
}

function parsedOwedKeep(stored: string | null): OwedKeep | null {
	try {
		const value = stored ? (JSON.parse(stored) as Partial<OwedKeep> | null) : null;
		return isOwedKeep(value) ? value : null;
	} catch {
		return null;
	}
}

/** Records the Keep, or where its writing stands, for every tab of the browser and the next load of the page. */
export function oweKeep(keep: OwedKeep): void {
	const key = keyOf(keep);
	try {
		const storage = browserStorage();
		if (storage) {
			storage.setItem(key, JSON.stringify(keep));
			inThisPage.delete(key);
			return;
		}
	} catch {
		// A full or blocked storage: this page keeps it
	}
	inThisPage.set(key, { ...keep });
}

/** The Keep as it stands now, read afresh: another tab may have written some of it, or all of it. */
export function owedKeepNow(keep: Pick<OwedKeep, 'timeLogId' | 'heartbeat'>): OwedKeep | null {
	const key = keyOf(keep);
	const kept = inThisPage.get(key);
	if (kept) return { ...kept };
	try {
		return parsedOwedKeep(browserStorage()?.getItem(key) ?? null);
	} catch {
		return null;
	}
}

/** The Keep is written, or no longer this browser's to write. */
export function forgetOwedKeep(keep: Pick<OwedKeep, 'timeLogId' | 'heartbeat'>): void {
	const key = keyOf(keep);
	inThisPage.delete(key);
	try {
		browserStorage()?.removeItem(key);
	} catch {
		// Nothing to remove from a storage that cannot be reached
	}
}

/** The Keeps the employee is owed, oldest first. One owed for more than a day is forgotten. */
export function owedKeepsOf(employeeId: string, now: number = Date.now()): OwedKeep[] {
	const keeps = new Map<string, OwedKeep>(inThisPage);
	const storage = browserStorage();
	try {
		for (let index = 0; storage && index < storage.length; index += 1) {
			const key = storage.key(index);
			if (!key?.startsWith(KEY_PREFIX)) continue;
			const keep = parsedOwedKeep(storage.getItem(key));
			if (keep) keeps.set(key, keep);
		}
	} catch {
		// A storage that cannot be read owes nothing
	}
	const owed: OwedKeep[] = [];
	for (const keep of keeps.values()) {
		if (now - keep.keptAt > OWED_FOR_AT_MOST_MS) {
			forgetOwedKeep(keep);
		} else if (keep.employeeId === employeeId) {
			owed.push(keep);
		}
	}
	return owed.sort((first, second) => first.keptAt - second.keptAt);
}
