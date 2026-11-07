import type { QueryKey } from '@tanstack/react-query';
import { keyOf, RealtimeInvalidation } from './invalidation';

/** The refetch function the scheduler drives (`queryClient.invalidateQueries({ queryKey })`). */
export type Invalidate = (queryKey: QueryKey) => void;

export interface InvalidationSchedulerOptions {
	invalidate: Invalidate;
	/** Whether a text field of an editing area is focused right now: deferrable refetches wait while it is. */
	isEditing: () => boolean;
	/** How long refetches are folded before they run. */
	windowMs?: number;
	/** The longest a deferrable refetch waits for the user to leave the field. */
	maxDeferMs?: number;
	setTimeout?: (fn: () => void, ms: number) => unknown;
	clearTimeout?: (handle: unknown) => void;
	/** The clock the deferral is measured on (the timers' own in tests). */
	now?: () => number;
}

/**
 * Folds the refetches a burst of hints asks for (one per query per window), and holds the ones of an editing
 * area while the user is typing there — a focused comment box keeps its draft and its focus; the rest of the
 * task refreshes — for at most `maxDeferMs`, so a long edit still sees changes.
 */
export class InvalidationScheduler {
	private readonly pending = new Map<string, { queryKey: QueryKey; deferrable: boolean }>();
	private timer: unknown = null;
	private deferredSince: number | null = null;
	private readonly windowMs: number;
	private readonly maxDeferMs: number;
	private readonly setTimer: (fn: () => void, ms: number) => unknown;
	private readonly clearTimer: (handle: unknown) => void;
	private readonly now: () => number;
	private disposed = false;

	constructor(private readonly options: InvalidationSchedulerOptions) {
		this.windowMs = options.windowMs ?? 400;
		this.maxDeferMs = options.maxDeferMs ?? 15_000;
		this.setTimer = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
		this.clearTimer = options.clearTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
		this.now = options.now ?? (() => Date.now());
	}

	add(invalidations: readonly RealtimeInvalidation[]): void {
		if (this.disposed) return;
		for (const invalidation of invalidations) {
			const key = keyOf(invalidation.queryKey);
			const known = this.pending.get(key);
			// A non-deferrable ask of a key wins over a deferrable one: it runs at the window's end.
			if (!known || (known.deferrable && !invalidation.deferrable)) {
				this.pending.set(key, { queryKey: invalidation.queryKey, deferrable: invalidation.deferrable });
			}
		}
		this.schedule(this.windowMs);
	}

	/** Runs what is pending now, deferrable or not (the user left the field, the page is leaving). */
	flush(): void {
		this.cancel();
		this.run(true);
	}

	dispose(): void {
		this.disposed = true;
		this.cancel();
		this.pending.clear();
	}

	private schedule(ms: number): void {
		if (this.timer !== null) return;
		this.timer = this.setTimer(() => {
			this.timer = null;
			this.run(false);
		}, ms);
	}

	private run(force: boolean): void {
		if (this.pending.size === 0) {
			this.deferredSince = null;
			return;
		}
		const editing = !force && this.options.isEditing();
		const now = this.now();
		if (editing && this.deferredSince === null) this.deferredSince = now;
		const holdExpired = this.deferredSince !== null && now - this.deferredSince >= this.maxDeferMs;
		const hold = editing && !holdExpired;

		for (const [key, entry] of [...this.pending]) {
			if (hold && entry.deferrable) continue;
			this.pending.delete(key);
			try {
				this.options.invalidate(entry.queryKey);
			} catch {
				// A refetch that cannot be asked is the query's own problem.
			}
		}
		if (this.pending.size === 0) {
			this.deferredSince = null;
			return;
		}
		// Something is held: look again soon, or at the latest when the hold expires.
		this.schedule(Math.min(this.windowMs * 2, Math.max(50, this.maxDeferMs - (now - (this.deferredSince ?? now)))));
	}

	private cancel(): void {
		if (this.timer !== null) {
			this.clearTimer(this.timer);
			this.timer = null;
		}
	}
}

/** Whether the active element of a document is a text field (input, textarea or editable content). */
export function isTextFieldFocused(doc: Pick<Document, 'activeElement'> | undefined): boolean {
	const element = doc?.activeElement as (Element & { isContentEditable?: boolean; type?: string }) | null | undefined;
	if (!element) return false;
	const tag = element.tagName?.toUpperCase();
	if (tag === 'TEXTAREA') return true;
	if (tag === 'INPUT') {
		const type = String(element.type ?? 'text').toLowerCase();
		return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color'].includes(type);
	}
	return element.isContentEditable === true;
}
