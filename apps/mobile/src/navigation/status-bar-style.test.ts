import { statusBarStyleFor } from './status-bar-style';

describe('the status bar style', () => {
	it('puts dark icons on the light theme', () => {
		expect(statusBarStyleFor('light')).toBe('dark');
	});

	it('puts light icons on the dark theme', () => {
		expect(statusBarStyleFor('dark')).toBe('light');
	});
});
