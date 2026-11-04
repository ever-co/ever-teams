'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { cn } from '@/core/lib/helpers';

const BAR_COUNT = 5;
const MIN_SCALE = 0.18;

/** The speech band of the spectrum, split in one slice per bar. */
const FIRST_BIN = 2;
const BINS_PER_BAR = 6;

function barScale(frequencies: Uint8Array, barIndex: number) {
	const start = FIRST_BIN + barIndex * BINS_PER_BAR;
	let sum = 0;
	for (let bin = start; bin < start + BINS_PER_BAR; bin += 1) {
		sum += frequencies[bin] ?? 0;
	}
	const average = sum / BINS_PER_BAR / 255;
	const boosted = average * 1.6;
	const capped = Math.min(1, boosted);
	return Math.max(MIN_SCALE, capped);
}

/**
 * The microphone's real level as a few bars: it moves only while the person speaks, so it shows the recording
 * hears them. Drawn by writing transforms in an animation frame, without any React render.
 */
export function VoiceLevelMeter({
	analyserRef,
	isActive,
	className
}: Readonly<{ analyserRef: RefObject<AnalyserNode | null>; isActive: boolean; className?: string }>) {
	const barsRef = useRef<Array<HTMLSpanElement | null>>([]);

	useEffect(() => {
		if (!isActive) {
			for (const bar of barsRef.current) {
				bar?.style.setProperty('transform', `scaleY(${MIN_SCALE})`);
			}
			return;
		}
		let frame = 0;
		const draw = () => {
			const analyser = analyserRef.current;
			if (analyser) {
				const frequencies = new Uint8Array(analyser.frequencyBinCount);
				analyser.getByteFrequencyData(frequencies);
				barsRef.current.forEach((bar, index) => {
					bar?.style.setProperty('transform', `scaleY(${barScale(frequencies, index)})`);
				});
			}
			frame = window.requestAnimationFrame(draw);
		};
		frame = window.requestAnimationFrame(draw);
		return () => window.cancelAnimationFrame(frame);
	}, [analyserRef, isActive]);

	return (
		<span aria-hidden="true" className={cn('flex h-4 items-center gap-[3px]', className)}>
			{Array.from({ length: BAR_COUNT }, (_, index) => (
				<span
					key={index}
					ref={(node) => {
						barsRef.current[index] = node;
					}}
					className="h-full w-[3px] origin-center rounded-full bg-current transition-transform duration-75"
					style={{ transform: `scaleY(${MIN_SCALE})` }}
				/>
			))}
		</span>
	);
}
