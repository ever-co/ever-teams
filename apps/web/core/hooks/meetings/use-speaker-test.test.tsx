/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useSpeakerTest } from './use-speaker-test';

/** An AudioContext that records what the tone does; jsdom has no Web Audio. */
function installAudioContext() {
	const contexts: Array<{
		currentTime: number;
		close: jest.Mock;
		oscillator: { start: jest.Mock; stop: jest.Mock; onended?: () => void };
		gainNode: { gain: { setValueAtTime: jest.Mock; linearRampToValueAtTime: jest.Mock } };
	}> = [];
	class FakeAudioContext {
		currentTime = 0;
		close = jest.fn(() => Promise.resolve());
		oscillator = {
			frequency: { value: 0 },
			connect: jest.fn(),
			start: jest.fn(),
			stop: jest.fn(),
			onended: undefined as (() => void) | undefined
		};
		constructor() {
			contexts.push(this);
		}
		createOscillator() {
			return this.oscillator;
		}
		gainNode = { gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() }, connect: jest.fn() };
		createGain() {
			return this.gainNode;
		}
		createMediaStreamDestination() {
			return { stream: { id: 'tone' } };
		}
	}
	Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true });
	return contexts;
}

describe('useSpeakerTest', () => {
	const setSinkId = jest.fn(() => Promise.resolve());
	const play = jest.fn(() => Promise.resolve());

	beforeEach(() => {
		setSinkId.mockClear();
		play.mockClear();
		Object.assign(HTMLMediaElement.prototype, { setSinkId, play, pause: jest.fn() });
	});

	it('plays a short tone through the speaker picked, and stops it on demand', async () => {
		const contexts = installAudioContext();
		const { result } = renderHook(() => useSpeakerTest());

		await act(async () => {
			await result.current.play('speaker-2');
		});

		expect(setSinkId).toHaveBeenCalledWith('speaker-2');
		expect(play).toHaveBeenCalledTimes(1);
		expect(contexts[0].oscillator.start).toHaveBeenCalled();
		expect(contexts[0].oscillator.stop).toHaveBeenCalledWith(1.5);
		expect(result.current.isPlaying).toBe(true);
		expect(result.current.toneStream).toEqual({ id: 'tone' });

		act(() => {
			result.current.stop();
		});

		expect(result.current.isPlaying).toBe(false);
		expect(contexts[0].close).toHaveBeenCalled();
	});

	it('ends by itself when the tone is over, and plays on the default speaker when none is picked', async () => {
		const contexts = installAudioContext();
		const { result } = renderHook(() => useSpeakerTest());

		await act(async () => {
			await result.current.play('');
		});
		expect(setSinkId).not.toHaveBeenCalled();

		act(() => {
			contexts[0].oscillator.onended?.();
		});

		expect(result.current.isPlaying).toBe(false);
		expect(contexts[0].close).toHaveBeenCalled();
	});

	it('plays nothing and says so when the speaker picked refuses the tone, until a test plays again', async () => {
		const contexts = installAudioContext();
		setSinkId.mockRejectedValueOnce(
			Object.assign(new Error('Requested device not found'), { name: 'NotFoundError' })
		);
		const { result } = renderHook(() => useSpeakerTest());

		await act(async () => {
			await result.current.play('speaker-gone');
		});

		expect(result.current.hasFailed).toBe(true);
		expect(result.current.isPlaying).toBe(false);
		expect(result.current.toneStream).toBeNull();
		expect(contexts[0].oscillator.start).not.toHaveBeenCalled();
		expect(contexts[0].close).toHaveBeenCalled();

		await act(async () => {
			await result.current.play('speaker-2');
		});
		expect(result.current.hasFailed).toBe(false);
		expect(result.current.isPlaying).toBe(true);
	});

	it('plays on the default speaker where the browser cannot pick one', async () => {
		installAudioContext();
		Object.assign(HTMLMediaElement.prototype, { setSinkId: undefined });
		const { result } = renderHook(() => useSpeakerTest());

		await act(async () => {
			await result.current.play('speaker-2');
		});

		expect(play).toHaveBeenCalledTimes(1);
		expect(result.current.isPlaying).toBe(true);
		expect(result.current.hasFailed).toBe(false);
	});

	it('counts the tone from when the speaker is ready, not from when the test was pressed', async () => {
		const contexts = installAudioContext();
		// Picking the speaker and starting the audio take a while: the context runs on meanwhile
		play.mockImplementationOnce(async () => {
			contexts[0].currentTime = 2.5;
		});
		const { result } = renderHook(() => useSpeakerTest());

		await act(async () => {
			await result.current.play('speaker-2');
		});

		const { setValueAtTime, linearRampToValueAtTime } = contexts[0].gainNode.gain;
		expect(setValueAtTime).toHaveBeenNthCalledWith(1, 0, 2.5);
		expect(linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 4);
		expect(contexts[0].oscillator.start).toHaveBeenCalledWith(2.5);
		expect(contexts[0].oscillator.stop).toHaveBeenCalledWith(4);
	});
});
