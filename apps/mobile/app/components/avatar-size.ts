import type { ViewStyle } from 'react-native';

/** The initial's size before it followed the avatar's, kept for an avatar drawn without a size. */
const UNSIZED_INITIAL = 42;
const INITIAL_SHARE = 0.45;

/** The initial of an avatar without a picture, in proportion to the avatar so it never spills out of it. */
export function avatarInitialSizeOf(size: number | undefined): number {
	if (size === undefined) {
		return UNSIZED_INITIAL;
	}
	return Math.round(size * INITIAL_SHARE);
}

/** The avatar's own box, so a row lines it up with what sits beside it. */
export function avatarBoxOf(size: number | undefined): ViewStyle {
	if (size === undefined) {
		return {};
	}
	return { height: size, width: size };
}

const BADGE_SHARE = 0.4;
const BADGE_MIN = 16;
const BADGE_MAX = 25;
const THICK_RING_FROM = 22;

/** The presence badge on an avatar: 40% of it between 16 and 25, so it never covers the initial of a small one. */
export function avatarBadgeOf(size: number | undefined): { size: number; borderWidth: number } {
	if (size === undefined) {
		return { size: BADGE_MAX, borderWidth: 3 };
	}
	const badge = Math.min(BADGE_MAX, Math.max(BADGE_MIN, Math.round(size * BADGE_SHARE)));
	if (badge >= THICK_RING_FROM) {
		return { size: badge, borderWidth: 3 };
	}
	return { size: badge, borderWidth: 2 };
}
