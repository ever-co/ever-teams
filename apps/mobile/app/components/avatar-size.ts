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
