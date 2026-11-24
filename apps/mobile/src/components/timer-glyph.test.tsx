import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TimerGlyph } from './timer-glyph';

// The drawing as views that keep their path data and fill, so the test reads which pieces a mark draws
jest.mock('react-native-svg', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: ({ children, testID }: { children?: unknown; testID?: string }) =>
			createElement(View, { testID }, children),
		Path: ({ d, fill }: { d: string; fill: string }) =>
			createElement(View, { testID: 'timer-glyph-piece', d, fill })
	};
});

// Where each piece of the web's marks starts (apps/web/assets/svg.tsx, TimerPlayIcon and TimerStopIcon)
const WEB_PLAY_STARTS = ['M20.4043 11.2', 'M21.1056 18.0367'];
const WEB_STOP_STARTS = ['M23.7533 9.07667', 'M24.4999 12.9383'];

function drawnPieces() {
	return screen.getAllByTestId('timer-glyph-piece').map(({ props }) => ({
		start: /^M[\d.]+ [\d.]+/.exec(props.d)?.[0],
		fill: props.fill
	}));
}

describe("the timer's glyph", () => {
	it("draws the web's play mark while the timer is stopped, the stop mark while it runs", async () => {
		const { rerender } = await render(<TimerGlyph running={false} size={24} color="#ffffff" />);

		expect(screen.getByTestId('timer-glyph-play')).toBeTruthy();
		expect(drawnPieces()).toEqual(WEB_PLAY_STARTS.map((start) => ({ start, fill: '#ffffff' })));

		await rerender(<TimerGlyph running size={24} color="#000000" />);

		expect(screen.getByTestId('timer-glyph-stop')).toBeTruthy();
		expect(drawnPieces()).toEqual(WEB_STOP_STARTS.map((start) => ({ start, fill: '#000000' })));
	});
});
