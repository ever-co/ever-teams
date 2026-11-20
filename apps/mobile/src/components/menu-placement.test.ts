import { menuPlacementOf } from './menu-placement';

const PHONE = { width: 360, bottom: 640 };

describe('where a menu opens', () => {
	it('opens under its trigger, 4 below, its start on the trigger start, 240 wide', () => {
		const trigger = { x: 40, y: 200, width: 120, height: 30 };

		expect(menuPlacementOf(trigger, 300, PHONE)).toEqual({ top: 234, left: 40, width: 240, maxHeight: 398 });
	});

	it('stays 8 from the right edge when the trigger sits near it', () => {
		const trigger = { x: 300, y: 200, width: 50, height: 30 };

		expect(menuPlacementOf(trigger, 300, PHONE).left).toBe(112);
	});

	it('opens above a trigger with no room below', () => {
		const trigger = { x: 40, y: 500, width: 120, height: 30 };

		expect(menuPlacementOf(trigger, 300, PHONE)).toEqual({ top: 196, left: 40, width: 240, maxHeight: 488 });
	});

	it('takes the larger side when it fits on neither, so its list scrolls there', () => {
		const trigger = { x: 40, y: 260, width: 120, height: 30 };

		const placement = menuPlacementOf(trigger, 500, PHONE);

		expect(placement).toEqual({ top: 294, left: 40, width: 240, maxHeight: 338 });
	});

	it('opens above when the keyboard takes the room below', () => {
		const trigger = { x: 40, y: 200, width: 120, height: 30 };

		expect(menuPlacementOf(trigger, 150, { width: 360, bottom: 380 }).top).toBe(46);
	});

	it('narrows on a screen under 256 wide, 8 from each edge', () => {
		const trigger = { x: 20, y: 100, width: 100, height: 30 };

		expect(menuPlacementOf(trigger, 100, { width: 240, bottom: 640 })).toMatchObject({ left: 8, width: 224 });
	});
});
