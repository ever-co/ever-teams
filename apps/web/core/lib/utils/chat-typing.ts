import { CHAT_TYPING_TTL_MS, type IChatTypingSignal } from '@/core/types/interfaces/common/chat';

/**
 * "Anna is typing…": what the conversation and a thread show of the others typing, from the real-time channel's
 * `typing.signalled` signal, and how often this tab tells that its person types.
 */

/**
 * How often this tab tells that its person is typing in one place: more than the platform's own floor (2.5 s), well
 * within the time a signal holds (6 s), so a steady typist stays shown without a gap.
 */
export const CHAT_TYPING_SEND_INTERVAL_MS = 3000;

/** The longest a signal is shown, whatever it asks: a typist who stops is never shown for long. */
const TYPING_MAX_HOLD_MS = 30_000;

/** Someone typing in one place (a conversation, or one of its threads), until `expiresAt` on this tab's clock. */
export interface ChatTypist {
	userId: string;
	employeeId: string | null;
	conversationId: string;
	threadRootId: string | null;
	expiresAt: number;
}

function idOf(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

/** The signal a live event carries, when it is one (an id for the place and the typist, at the least). */
export function typingSignalOf(data: unknown): IChatTypingSignal | null {
	if (!data || typeof data !== 'object') return null;
	const record = data as Record<string, unknown>;
	const conversationId = idOf(record.conversationId);
	const userId = idOf(record.userId);
	if (!conversationId || !userId) return null;
	const expiresInMs = typeof record.expiresInMs === 'number' && Number.isFinite(record.expiresInMs) ? record.expiresInMs : undefined;
	return {
		conversationId,
		userId,
		threadRootId: idOf(record.threadRootId),
		employeeId: idOf(record.employeeId),
		at: typeof record.at === 'string' ? record.at : '',
		expiresInMs
	};
}

/** How long a signal is shown, counted from when this tab heard it (two clocks never agree to the second). */
export function typingHoldOf(signal: Pick<IChatTypingSignal, 'expiresInMs'>): number {
	const asked = signal.expiresInMs;
	if (typeof asked !== 'number' || !Number.isFinite(asked) || asked <= 0) return CHAT_TYPING_TTL_MS;
	return Math.min(asked, TYPING_MAX_HOLD_MS);
}

/**
 * The typists once a signal is heard: its typist shown in its place from now for the time it holds (a signal again
 * from the same person and place moves the end on). Myself never: another tab of mine tells my own typing.
 */
export function withTypingSignal(typists: readonly ChatTypist[], signal: IChatTypingSignal, meUserId: string | null, now: number): ChatTypist[] {
	if (meUserId && String(signal.userId) === String(meUserId)) return [...typists];
	const threadRootId = signal.threadRootId ?? null;
	const entry: ChatTypist = {
		userId: String(signal.userId),
		employeeId: signal.employeeId ? String(signal.employeeId) : null,
		conversationId: String(signal.conversationId),
		threadRootId,
		expiresAt: now + typingHoldOf(signal)
	};
	const others = typists.filter((typist) => !(typist.userId === entry.userId && typist.conversationId === entry.conversationId && typist.threadRootId === threadRootId));
	return [...others, entry];
}

/** The typists still shown at this moment. */
export function withoutExpired(typists: readonly ChatTypist[], now: number): ChatTypist[] {
	return typists.filter((typist) => typist.expiresAt > now);
}

/** A message of theirs arrived in the conversation: they stopped typing there (in the conversation and its threads). */
export function withoutAuthor(typists: readonly ChatTypist[], conversationId: string, userId: string): ChatTypist[] {
	return typists.filter((typist) => !(typist.conversationId === conversationId && typist.userId === userId));
}

/** The typists of one place: the conversation itself (`threadRootId` null), or one thread of it. */
export function typistsIn(typists: readonly ChatTypist[], conversationId: string, threadRootId: string | null): ChatTypist[] {
	return typists.filter((typist) => typist.conversationId === conversationId && typist.threadRootId === (threadRootId ?? null));
}

/** When the first shown typist is due to go, if any is shown. */
export function nextTypingExpiry(typists: readonly ChatTypist[]): number | null {
	if (!typists.length) return null;
	return Math.min(...typists.map((typist) => typist.expiresAt));
}

/** The words of the line: one name, two names, or "several people" from three on. Null when nobody types. */
export function typingLineOf(
	names: readonly string[]
): { key: 'TYPING_ONE'; values: { name: string } } | { key: 'TYPING_TWO'; values: { first: string; second: string } } | { key: 'TYPING_SEVERAL'; values: Record<string, never> } | null {
	if (!names.length) return null;
	if (names.length === 1) return { key: 'TYPING_ONE', values: { name: names[0] } };
	if (names.length === 2) return { key: 'TYPING_TWO', values: { first: names[0], second: names[1] } };
	return { key: 'TYPING_SEVERAL', values: {} };
}

/** Whether a keystroke should tell the others now: the first one, then once the interval has passed. */
export function shouldSignalTyping(lastSentAt: number | null, now: number, interval = CHAT_TYPING_SEND_INTERVAL_MS): boolean {
	return lastSentAt === null || now - lastSentAt >= interval;
}
