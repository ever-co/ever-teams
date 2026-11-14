import { describe, expect, it } from '@jest/globals';
import { centredScrollLeftOf, stripOverflows, type StripBox } from './strip-scroll';

const phoneStrip: StripBox = { left: 16, scrollLeft: 0, clientWidth: 343, scrollWidth: 520 };

describe('stripOverflows', () => {
	it('is true when the strip holds more than it shows', () => {
		expect(stripOverflows(phoneStrip)).toBe(true);
	});

	it('is false when every item fits', () => {
		expect(stripOverflows({ ...phoneStrip, scrollWidth: 343 })).toBe(false);
	});
});

describe('centredScrollLeftOf', () => {
	it('scrolls an item beyond the right edge into the middle', () => {
		const offScreenTab = { left: 420, width: 60 };
		expect(centredScrollLeftOf(phoneStrip, offScreenTab)).toBe(262.5);
	});

	it('counts what the strip has already scrolled', () => {
		const scrolled = { ...phoneStrip, scrollLeft: 100 };
		const tabSeenAfterScroll = { left: 320, width: 60 };
		expect(centredScrollLeftOf(scrolled, tabSeenAfterScroll)).toBe(262.5);
	});

	it('never scrolls before the start for the first item', () => {
		const firstTab = { left: 28, width: 40 };
		expect(centredScrollLeftOf(phoneStrip, firstTab)).toBe(0);
	});
});
