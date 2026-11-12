/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useSpeakerTest } from './use-speaker-test';

/** An AudioContext that records what the tone does; jsdom has no Web Audio. */
function installAudioContext() {
	const contexts: Array<{
		close: jest.Mock;
		oscillator: { start: jest.Mock; stop: jest.Mock; onended?: () => void };
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
		createGain() {
			return { gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() }, connect: jest.fn() };
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
});
