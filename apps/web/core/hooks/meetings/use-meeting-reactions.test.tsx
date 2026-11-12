/** @jest-environment jsdom */
import { TextDecoder, TextEncoder } from 'node:util';
import { act, renderHook } from '@testing-library/react';

// jsdom has no TextEncoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockSend = jest.fn();
let mockReceive: ((message: { payload: Uint8Array; from?: { name?: string; identity: string } }) => void) | undefined;

jest.mock('@livekit/components-react', () => ({
	useLocalParticipant: () => ({ localParticipant: { name: 'Ruslan', identity: 'me' } }),
	useDataChannel: (_topic: string, onMessage: typeof mockReceive) => {
		mockReceive = onMessage;
		return { send: mockSend };
	}
}));

import { reactionOfPayload, useMeetingReactions } from './use-meeting-reactions';

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe('useMeetingReactions', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockSend.mockReset().mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('sends a reaction to everyone and shows it here at once, for a few seconds', async () => {
		const { result } = renderHook(() => useMeetingReactions());

		await act(async () => {
			await result.current.react('👏');
		});

		expect(mockSend).toHaveBeenCalledWith(bytesOf('👏'), { reliable: true });
		expect(result.current.shown).toEqual([{ id: 1, emoji: '👏', name: 'Ruslan' }]);
		act(() => {
			jest.advanceTimersByTime(4000);
		});
		expect(result.current.shown).toEqual([]);
	});

	it("shows the others' reactions with their name, and nothing for any other message", () => {
		const { result } = renderHook(() => useMeetingReactions());

		act(() => {
			mockReceive?.({ payload: bytesOf('🎉'), from: { name: 'Ana Silva', identity: 'ana' } });
			mockReceive?.({ payload: bytesOf('hello <b>there</b>'), from: { identity: 'bob' } });
			mockReceive?.({ payload: bytesOf('👍'), from: { identity: 'bob' } });
		});

		expect(result.current.shown.map(({ emoji, name }) => [emoji, name])).toEqual([
			['🎉', 'Ana Silva'],
			['👍', 'bob']
		]);
	});

	it('reads a reaction from a message, and nothing from other text or broken bytes', () => {
		expect(reactionOfPayload(bytesOf('❤️'))).toBe('❤️');
		expect(reactionOfPayload(bytesOf('❤'))).toBeNull();
		expect(reactionOfPayload(new Uint8Array([0xff, 0xfe]))).toBeNull();
	});
});
