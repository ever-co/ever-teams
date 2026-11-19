import { avatarBoxOf, avatarInitialSizeOf } from './avatar-size';

describe("an avatar's size", () => {
	it('draws the initial in proportion to the avatar, where a fixed 42 spilled out of a 40 avatar', () => {
		expect(avatarInitialSizeOf(40)).toBe(18);
		expect(avatarInitialSizeOf(48)).toBe(22);
	});

	it('takes its own box, where a share of a row without height let it hang below the row', () => {
		expect(avatarBoxOf(40)).toEqual({ height: 40, width: 40 });
	});

	it('keeps the old initial for an avatar drawn without a size', () => {
		expect(avatarInitialSizeOf(undefined)).toBe(42);
		expect(avatarBoxOf(undefined)).toEqual({});
	});
});
