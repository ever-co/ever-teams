import { revealedScrollLeftOf } from './scroll-reveal';

const ROOM = 4;

describe('revealedScrollLeftOf', () => {
	it('leaves the scroller where it is when the span already shows with its room', () => {
		const view = { scrollLeft: 10, viewWidth: 100, contentWidth: 300 };

		expect(revealedScrollLeftOf(view, { start: 30, end: 60 }, ROOM)).toBe(10);
	});

	it('scrolls just enough to show a span cut on the right, room included', () => {
		const view = { scrollLeft: 0, viewWidth: 100, contentWidth: 400 };

		expect(revealedScrollLeftOf(view, { start: 150, end: 180 }, ROOM)).toBe(84);
	});

	it('scrolls back just enough to show a span cut on the left, room included', () => {
		const view = { scrollLeft: 200, viewWidth: 100, contentWidth: 400 };

		expect(revealedScrollLeftOf(view, { start: 100, end: 130 }, ROOM)).toBe(96);
	});

	it('shows the start of a span wider than the view', () => {
		const view = { scrollLeft: 0, viewWidth: 50, contentWidth: 400 };

		expect(revealedScrollLeftOf(view, { start: 100, end: 200 }, ROOM)).toBe(96);
	});

	it('goes all the way to an end the target falls within the room of', () => {
		const view = { scrollLeft: 0, viewWidth: 343, contentWidth: 389 };

		expect(revealedScrollLeftOf(view, { start: 323, end: 383 }, ROOM)).toBe(46);
		expect(revealedScrollLeftOf({ ...view, scrollLeft: 46 }, { start: 6, end: 59 }, ROOM)).toBe(0);
	});

	it('never scrolls past either end of the content', () => {
		const view = { scrollLeft: 0, viewWidth: 100, contentWidth: 400 };

		expect(revealedScrollLeftOf(view, { start: 380, end: 420 }, ROOM)).toBe(300);
		expect(revealedScrollLeftOf({ ...view, scrollLeft: 300 }, { start: -10, end: 20 }, ROOM)).toBe(0);
	});

	it('stays at the start when the content fits the view', () => {
		const view = { scrollLeft: 0, viewWidth: 400, contentWidth: 300 };

		expect(revealedScrollLeftOf(view, { start: 250, end: 298 }, ROOM)).toBe(0);
	});
});
