const PROFILE_SEGMENT = 'profile';

const LOCALE_PREFIXED_INDEX = 1;

/**
 * The default locale has no prefix (`/profile/…`) and the others carry one (`/fr/profile/…`), so a profile path has
 * `profile` as its first or second segment.
 */
export function isProfilePathname(pathname: string | null | undefined): boolean {
	if (!pathname) {
		return false;
	}
	const segments = pathname.split('/').filter(Boolean);
	const profileIndex = segments.indexOf(PROFILE_SEGMENT);
	const isUnprefixed = profileIndex === 0;
	const isLocalePrefixed = profileIndex === LOCALE_PREFIXED_INDEX;
	return isUnprefixed || isLocalePrefixed;
}
