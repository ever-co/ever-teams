import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * The web's timer glyphs (apps/web/assets/svg.tsx, TimerPlayIcon and TimerStopIcon): the mark that starts the timer
 * and the one that stops it, each two filled pieces on a 28 grid.
 */
const PLAY_PIECES = [
	'M20.4043 11.2L6.53268 19.565C5.71602 20.055 4.66602 19.4717 4.66602 18.515V9.18168C4.66602 5.11002 9.06435 2.56668 12.5993 4.59668L17.9544 7.67668L20.3927 9.07668C21.1977 9.55502 21.2094 10.7217 20.4043 11.2Z',
	'M21.1056 18.0367L16.3806 20.7667L11.6673 23.485C9.97559 24.4533 8.06226 24.255 6.67393 23.275C5.99726 22.8083 6.07893 21.77 6.79059 21.35L21.6189 12.46C22.3189 12.04 23.2406 12.4367 23.3689 13.2417C23.6606 15.05 22.9139 16.9983 21.1056 18.0367Z'
];
const STOP_PIECES = [
	'M23.7533 9.07667L5.29667 20.16C4.585 20.5917 3.62833 20.16 3.535 19.3317C3.51167 19.11 3.5 18.8883 3.5 18.6667V9.33333C3.5 5.83333 5.83333 3.5 9.33333 3.5H18.6667C22.1667 3.5 23.6017 5.29667 24.2783 7.75833C24.4183 8.27167 24.1967 8.80833 23.7533 9.07667Z',
	'M24.4999 12.9383V18.6666C24.4999 22.1666 22.1666 24.4999 18.6666 24.4999H9.33323C8.2599 24.4999 7.2449 24.2083 6.38156 23.6949C5.6349 23.2633 5.68156 22.1666 6.41656 21.7233L22.7266 11.9349C23.5082 11.4683 24.4999 12.0283 24.4999 12.9383Z'
];

function piecesOf(running: boolean): string[] {
	if (running) {
		return STOP_PIECES;
	}
	return PLAY_PIECES;
}

function glyphNameOf(running: boolean): string {
	if (running) {
		return 'stop';
	}
	return 'play';
}

interface ITimerGlyph {
	/** A running timer shows the stop mark, a stopped one the play mark. */
	running: boolean;
	size: number;
	color: string;
}

export function TimerGlyph({ running, size, color }: Readonly<ITimerGlyph>) {
	return (
		<Svg testID={`timer-glyph-${glyphNameOf(running)}`} width={size} height={size} viewBox="0 0 28 28" fill="none">
			{piecesOf(running).map((piece) => (
				<Path key={piece} d={piece} fill={color} />
			))}
		</Svg>
	);
}
