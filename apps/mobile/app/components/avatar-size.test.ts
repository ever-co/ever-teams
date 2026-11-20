import { avatarBadgeOf, avatarBoxOf, avatarInitialSizeOf } from './avatar-size';

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

	it('draws the presence badge at 40% of the avatar, where a fixed 25 covered the initial of a 40 one', () => {
		expect(avatarBadgeOf(40)).toEqual({ size: 16, borderWidth: 2 });
		expect(avatarBadgeOf(48)).toEqual({ size: 19, borderWidth: 2 });
		expect(avatarBadgeOf(76)).toEqual({ size: 25, borderWidth: 3 });
	});
});
