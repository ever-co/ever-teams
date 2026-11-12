import {
	CHAT_TYPING_SEND_INTERVAL_MS,
	nextTypingExpiry,
	shouldSignalTyping,
	typingHoldOf,
	typingLineOf,
	typingSignalOf,
	typistsIn,
	withoutAuthor,
	withoutExpired,
	withTypingSignal,
	type ChatTypist
} from './chat-typing';

const ME = 'user-me';
const signal = (userId: string, extra: Record<string, unknown> = {}) => ({
	conversationId: 'c1',
	threadRootId: null,
	userId,
	employeeId: `employee-${userId}`,
	at: '2026-11-11T10:00:00.000Z',
	expiresInMs: 6000,
	...extra
});

describe('typingSignalOf', () => {
	it('reads a signal, and nothing that lacks its place or its typist', () => {
		expect(typingSignalOf(signal('ana'))).toEqual(expect.objectContaining({ conversationId: 'c1', userId: 'ana', threadRootId: null, expiresInMs: 6000 }));
		expect(typingSignalOf({ userId: 'ana' })).toBeNull();
		expect(typingSignalOf({ conversationId: 'c1' })).toBeNull();
		expect(typingSignalOf(null)).toBeNull();
		expect(typingSignalOf(signal('ana', { expiresInMs: 'soon' }))?.expiresInMs).toBeUndefined();
	});
});

describe('typingHoldOf', () => {
	it('holds what the signal asks, six seconds when it asks nothing, never long', () => {
		expect(typingHoldOf({ expiresInMs: 4000 })).toBe(4000);
		expect(typingHoldOf({})).toBe(6000);
		expect(typingHoldOf({ expiresInMs: 0 })).toBe(6000);
		expect(typingHoldOf({ expiresInMs: 10 * 60_000 })).toBe(30_000);
	});
});

describe('the typists of a place', () => {
	it('shows a typist from now for the time their signal holds, on this tab clock', () => {
		const typists = withTypingSignal([], signal('ana', { expiresInMs: 6000 }), ME, 1_000);
		expect(typists).toEqual([{ userId: 'ana', employeeId: 'employee-ana', conversationId: 'c1', threadRootId: null, expiresAt: 7_000 }]);
		expect(withoutExpired(typists, 6_999)).toHaveLength(1);
		expect(withoutExpired(typists, 7_000)).toHaveLength(0);
	});

	it('moves the end on when the same person signals again in the same place, and keeps one entry', () => {
		const first = withTypingSignal([], signal('ana'), ME, 1_000);
		const again = withTypingSignal(first, signal('ana'), ME, 4_000);
		expect(again).toHaveLength(1);
		expect(again[0].expiresAt).toBe(10_000);
	});

	it('never shows myself', () => {
		expect(withTypingSignal([], signal(ME), ME, 1_000)).toEqual([]);
	});

	it('keeps the conversation and each thread apart', () => {
		let typists: ChatTypist[] = withTypingSignal([], signal('ana'), ME, 0);
		typists = withTypingSignal(typists, signal('bo', { threadRootId: 'root-1' }), ME, 0);
		expect(typistsIn(typists, 'c1', null).map((typist) => typist.userId)).toEqual(['ana']);
		expect(typistsIn(typists, 'c1', 'root-1').map((typist) => typist.userId)).toEqual(['bo']);
		expect(typistsIn(typists, 'c2', null)).toEqual([]);
	});

	it('drops a typist whose message arrived, in the conversation and its threads', () => {
		let typists: ChatTypist[] = withTypingSignal([], signal('ana'), ME, 0);
		typists = withTypingSignal(typists, signal('ana', { threadRootId: 'root-1' }), ME, 0);
		typists = withTypingSignal(typists, signal('bo'), ME, 0);
		expect(withoutAuthor(typists, 'c1', 'ana').map((typist) => typist.userId)).toEqual(['bo']);
		expect(withoutAuthor(typists, 'c2', 'ana')).toHaveLength(3);
	});

	it('knows when the first shown typist is due to go', () => {
		expect(nextTypingExpiry([])).toBeNull();
		const typists = [...withTypingSignal([], signal('ana', { expiresInMs: 6000 }), ME, 0), ...withTypingSignal([], signal('bo', { expiresInMs: 3000 }), ME, 0)];
		expect(nextTypingExpiry(typists)).toBe(3000);
	});
});

describe('typingLineOf', () => {
	it('names one or two typists and counts no further', () => {
		expect(typingLineOf([])).toBeNull();
		expect(typingLineOf(['Anna'])).toEqual({ key: 'TYPING_ONE', values: { name: 'Anna' } });
		expect(typingLineOf(['Anna', 'Ben'])).toEqual({ key: 'TYPING_TWO', values: { first: 'Anna', second: 'Ben' } });
		expect(typingLineOf(['Anna', 'Ben', 'Chen'])).toEqual({ key: 'TYPING_SEVERAL', values: {} });
	});
});

describe('shouldSignalTyping', () => {
	it('tells the first keystroke at once, then once every interval at most', () => {
		expect(CHAT_TYPING_SEND_INTERVAL_MS).toBe(3000);
		expect(shouldSignalTyping(null, 10_000)).toBe(true);
		expect(shouldSignalTyping(10_000, 12_999)).toBe(false);
		expect(shouldSignalTyping(10_000, 13_000)).toBe(true);
	});
});
