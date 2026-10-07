/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { SettingsFrame } from './settings-frame';

describe('SettingsFrame', () => {
	it('keeps navigation and settings content in the page scroll flow', () => {
		render(<SettingsFrame navigation={<nav>Settings navigation</nav>}>Settings form</SettingsFrame>);

		const frame = screen.getByTestId('settings-frame');
		expect(frame.contains(screen.getByText('Settings navigation'))).toBe(true);
		expect(frame.contains(screen.getByText('Settings form'))).toBe(true);
		expect(frame.className).not.toContain('overflow-y-auto');
		expect(frame.className).not.toContain('h-[calc');
	});
});
