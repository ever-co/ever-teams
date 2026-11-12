/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

const mockTyping = jest.fn();
const mockScope = { tenantId: 't1', organizationId: 'o1', userId: 'user-me', employeeId: 'employee-me' };

jest.mock('@/core/services/client/api/chat', () => ({
	chatService: { typing: (conversationId: string, input: unknown) => mockTyping(conversationId, input) }
}));
jest.mock('./use-chat-scope', () => ({ useChatScope: () => mockScope }));

import { realtimeBus } from '@/core/lib/realtime/bus';
import { resetChatTyping, useChatTypingSignal, useChatTypists } from './use-chat-typing';

function signalled(data: Record<string, unknown>) {
	realtimeBus.emit({
		eventId: `e-${Math.random()}`,
		eventName: 'typing.signalled',
		occurredAt: new Date().toISOString(),
		aggregate: { type: 'conversation', id: String(data.conversationId) },
		sequence: null,
		data
	});
}

function created(data: Record<string, unknown>) {
	realtimeBus.emit({
		eventId: `e-${Math.random()}`,
		eventName: 'chat_message.created',
		occurredAt: new Date().toISOString(),
		aggregate: { type: 'chat_message', id: 'm1' },
		sequence: 1,
		data
	});
}

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date(2026, 10, 11, 10, 0, 0));
	mockTyping.mockReset();
	mockTyping.mockResolvedValue({ sent: true, expiresInMs: 6000 });
	resetChatTyping();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('useChatTypingSignal', () => {
	it('tells the first keystroke at once, then at most every 3 s, for its place', () => {
		const { result } = renderHook(() => useChatTypingSignal('c1', 'root-1'));
		act(() => result.current());
		act(() => result.current());
		expect(mockTyping).toHaveBeenCalledTimes(1);
		expect(mockTyping).toHaveBeenCalledWith('c1', { threadRootId: 'root-1' });
		act(() => jest.advanceTimersByTime(2999));
		act(() => result.current());
		expect(mockTyping).toHaveBeenCalledTimes(1);
		act(() => jest.advanceTimersByTime(1));
		act(() => result.current());
		expect(mockTyping).toHaveBeenCalledTimes(2);
	});

	it('stops for the page once the platform says it has no typing route', async () => {
		mockTyping.mockRejectedValue(Object.assign(new Error('Cannot POST /api/chat/conversations/c1/typing'), { statusCode: 404 }));
		const { result } = renderHook(() => useChatTypingSignal('c1'));
		await act(async () => result.current());
		act(() => jest.advanceTimersByTime(5000));
		const other = renderHook(() => useChatTypingSignal('c2'));
		act(() => other.result.current());
		expect(mockTyping).toHaveBeenCalledTimes(1);
		expect(mockTyping).toHaveBeenCalledWith('c1', {});
	});

	it('stops for its place once the platform refuses it there', async () => {
		mockTyping.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
		const { result } = renderHook(() => useChatTypingSignal('c1'));
		await act(async () => result.current());
		act(() => jest.advanceTimersByTime(5000));
		act(() => result.current());
		expect(mockTyping).toHaveBeenCalledTimes(1);
		const other = renderHook(() => useChatTypingSignal('c2'));
		act(() => other.result.current());
		expect(mockTyping).toHaveBeenCalledTimes(2);
	});
});

describe('useChatTypists', () => {
	it('shows who types in its place for the time the signal holds, never myself', () => {
		const { result } = renderHook(() => useChatTypists('c1', null));
		act(() => {
			signalled({ conversationId: 'c1', userId: 'user-ana', employeeId: 'employee-ana', at: 'x', expiresInMs: 6000 });
			signalled({ conversationId: 'c1', userId: 'user-me', employeeId: 'employee-me', at: 'x', expiresInMs: 6000 });
			signalled({ conversationId: 'c1', threadRootId: 'root-1', userId: 'user-bo', at: 'x', expiresInMs: 6000 });
			signalled({ conversationId: 'c2', userId: 'user-chen', at: 'x', expiresInMs: 6000 });
		});
		expect(result.current.map((typist) => typist.userId)).toEqual(['user-ana']);
		act(() => jest.advanceTimersByTime(5900));
		expect(result.current).toHaveLength(1);
		act(() => jest.advanceTimersByTime(200));
		expect(result.current).toEqual([]);
	});

	it('keeps a typist who signals again, and drops them when their message arrives', () => {
		const { result } = renderHook(() => useChatTypists('c1', 'root-1'));
		act(() => signalled({ conversationId: 'c1', threadRootId: 'root-1', userId: 'user-bo', at: 'x', expiresInMs: 6000 }));
		act(() => jest.advanceTimersByTime(4000));
		act(() => signalled({ conversationId: 'c1', threadRootId: 'root-1', userId: 'user-bo', at: 'x', expiresInMs: 6000 }));
		act(() => jest.advanceTimersByTime(4000));
		expect(result.current.map((typist) => typist.userId)).toEqual(['user-bo']);
		act(() => created({ conversationId: 'c1', messageId: 'm1', threadRootId: 'root-1', authorUserId: 'user-bo' }));
		expect(result.current).toEqual([]);
	});

	it('holds a signal that says nothing of its time for six seconds', () => {
		const { result } = renderHook(() => useChatTypists('c1', null));
		act(() => signalled({ conversationId: 'c1', userId: 'user-ana', at: 'x' }));
		act(() => jest.advanceTimersByTime(5900));
		expect(result.current).toHaveLength(1);
		act(() => jest.advanceTimersByTime(200));
		expect(result.current).toEqual([]);
	});
});
