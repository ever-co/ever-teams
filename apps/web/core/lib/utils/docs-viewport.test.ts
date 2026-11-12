import { keyboardInsetOf } from './docs-viewport';

describe('keyboardInsetOf', () => {
	it('is the height the keyboard takes from the layout', () => {
		expect(keyboardInsetOf(800, { height: 500, offsetTop: 0 })).toBe(300);
		// The page scrolled under the keyboard: the visual viewport starts lower.
		expect(keyboardInsetOf(800, { height: 500, offsetTop: 120 })).toBe(180);
	});

	it('is 0 with the keyboard closed, a rounding below the layout, or no visual viewport', () => {
		expect(keyboardInsetOf(800, { height: 800, offsetTop: 0 })).toBe(0);
		expect(keyboardInsetOf(800, { height: 800.4, offsetTop: 0 })).toBe(0);
		expect(keyboardInsetOf(800, null)).toBe(0);
	});
});
