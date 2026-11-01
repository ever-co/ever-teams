import { APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';

/** The pathname without its leading locale segment, so `/fr/projects` and `/projects` compare equal. */
export function stripLocalePrefix(pathname: string): string {
	const segments = pathname.split('/').filter(Boolean);
	const firstSegment = segments[0];
	const hasLocalePrefix = segments.length > 0 && APPLICATION_LANGUAGES_CODE.includes(firstSegment);
	if (!hasLocalePrefix) {
		return pathname || '/';
	}
	const rest = segments.slice(1).join('/');
	return `/${rest}`;
}

function pathOfUrl(url: string): string {
	const withoutHash = url.split('#')[0];
	const withoutQuery = withoutHash.split('?')[0];
	return withoutQuery;
}

/** A navigation link is active on its own page and on the pages below it; `/` only on the home page. */
export function isPathActive(pathname: string | null | undefined, url: string | undefined): boolean {
	if (!pathname || !url) {
		return false;
	}
	const target = pathOfUrl(url);
	if (!target) {
		return false;
	}
	const current = stripLocalePrefix(pathname);
	if (target === '/') {
		return current === '/';
	}
	const isSamePage = current === target;
	const isPageBelow = current.startsWith(`${target}/`);
	return isSamePage || isPageBelow;
}
