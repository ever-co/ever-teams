'use client';

import { useEffect, useState } from 'react';

/** Ten readings a second: enough for a level meter, without a render per animation frame. */
const READING_INTERVAL_MS = 100;
/** Speech rarely goes past a quarter of the full scale: amplify so a normal voice fills the meter. */
const GAIN = 4;

/** How loud the microphone of a stream is, from 0 to 1, for the level meter of the pre-join screen. */
export function useAudioLevel(stream: MediaStream | null): number {
	const [level, setLevel] = useState(0);
	const track = stream?.getAudioTracks()[0] ?? null;

	useEffect(() => {
		const AudioContextClass = typeof window === 'undefined' ? undefined : window.AudioContext;
		if (!track || !AudioContextClass) {
			return;
		}
		const context = new AudioContextClass();
		const source = context.createMediaStreamSource(new MediaStream([track]));
		const analyser = context.createAnalyser();
		analyser.fftSize = 512;
		source.connect(analyser);
		const samples = new Uint8Array(analyser.fftSize);
		let frame = 0;
		let lastReading = 0;

		const read = (time: number) => {
			frame = requestAnimationFrame(read);
			if (time - lastReading < READING_INTERVAL_MS) {
				return;
			}
			lastReading = time;
			analyser.getByteTimeDomainData(samples);
			let sum = 0;
			for (const sample of samples) {
				const amplitude = (sample - 128) / 128;
				sum += amplitude * amplitude;
			}
			setLevel(Math.min(1, Math.sqrt(sum / samples.length) * GAIN));
		};
		frame = requestAnimationFrame(read);

		return () => {
			cancelAnimationFrame(frame);
			source.disconnect();
			void context.close().catch(() => undefined);
		};
	}, [track]);

	// No microphone to listen to: the meter rests, whatever it read last
	return track ? level : 0;
}
