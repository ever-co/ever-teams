import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TimerGlyph } from './timer-glyph';

describe("the timer's glyph", () => {
	it("draws the web's play mark while the timer is stopped, the stop mark while it runs", async () => {
		const { rerender } = await render(<TimerGlyph running={false} size={24} color="#ffffff" />);

		expect(screen.getByTestId('timer-glyph-play')).toBeTruthy();

		await rerender(<TimerGlyph running size={24} color="#ffffff" />);

		expect(screen.getByTestId('timer-glyph-stop')).toBeTruthy();
	});
});
