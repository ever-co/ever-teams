import { headerSurfaceOf } from './header-surface';

const colors = { background: 'card', background2: 'page' };

describe("the header's surface", () => {
	it('is the page color in dark mode, so the band under the header shows no seam', () => {
		expect(headerSurfaceOf(true, colors)).toBe('page');
	});

	it('is the card color in light mode', () => {
		expect(headerSurfaceOf(false, colors)).toBe('card');
	});
});
