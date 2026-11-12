'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** A tone long enough to hear where it comes from, short enough not to annoy. */
const TONE_SECONDS = 1.5;
const TONE_HERTZ = 440;
const TONE_VOLUME = 0.25;
/** The tone fades in and out over this long, so it starts and ends without a click. */
const FADE_SECONDS = 0.05;

/** An audio element that can play on a chosen output: `setSinkId` (Chrome, Edge, recent Firefox and Safari). */
type SinkableAudio = HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };

/**
 * A short tone through the speaker picked, to hear that it is the right one, and the stream it plays, for a level
 * meter. A browser that cannot pick an output plays it on the default one; a speaker that refuses it plays nothing,
 * and `hasFailed` says so.
 */
export function useSpeakerTest() {
	const [toneStream, setToneStream] = useState<MediaStream | null>(null);
	const [hasFailed, setHasFailed] = useState(false);
	const endToneRef = useRef<(() => void) | null>(null);

	const stop = useCallback(() => {
		endToneRef.current?.();
		endToneRef.current = null;
		setToneStream(null);
	}, []);

	const play = useCallback(
		async (sinkId: string) => {
			stop();
			setHasFailed(false);
			const AudioContextClass = typeof window === 'undefined' ? undefined : window.AudioContext;
			if (!AudioContextClass) {
				return;
			}
			const context = new AudioContextClass();
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			const destination = context.createMediaStreamDestination();
			const audio = new Audio() as SinkableAudio;
			const startsAt = context.currentTime;
			oscillator.frequency.value = TONE_HERTZ;
			gain.gain.setValueAtTime(0, startsAt);
			gain.gain.linearRampToValueAtTime(TONE_VOLUME, startsAt + FADE_SECONDS);
			gain.gain.setValueAtTime(TONE_VOLUME, startsAt + TONE_SECONDS - FADE_SECONDS);
			gain.gain.linearRampToValueAtTime(0, startsAt + TONE_SECONDS);
			oscillator.connect(gain);
			gain.connect(destination);

			let hasEnded = false;
			const endTone = () => {
				if (hasEnded) return;
				hasEnded = true;
				audio.pause();
				audio.srcObject = null;
				void context.close().catch(() => undefined);
			};
			endToneRef.current = endTone;
			oscillator.onended = () => {
				if (endToneRef.current === endTone) stop();
			};

			audio.srcObject = destination.stream;
			try {
				if (sinkId && typeof audio.setSinkId === 'function') {
					await audio.setSinkId(sinkId);
				}
				await audio.play();
			} catch {
				// A speaker unplugged meanwhile, or sound not allowed yet: no tone, rather than one nobody hears
				const isCurrent = endToneRef.current === endTone;
				endTone();
				if (isCurrent) {
					endToneRef.current = null;
					setHasFailed(true);
				}
				return;
			}
			if (hasEnded) {
				return;
			}
			oscillator.start();
			oscillator.stop(startsAt + TONE_SECONDS);
			setToneStream(destination.stream);
		},
		[stop]
	);

	// Leaving the settings ends the tone
	useEffect(() => stop, [stop]);

	return { isPlaying: toneStream !== null, toneStream, hasFailed, play, stop };
}
