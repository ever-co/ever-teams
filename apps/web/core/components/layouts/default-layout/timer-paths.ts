import { APPLICATION_LANGUAGES_CODE, PATH_WITH_MORE_THAN_ONE_TIMER } from '@/core/constants/config/constants';

function stripLocale(path: string) {
	const segments = path.split('/').filter(Boolean);
	const firstSegment = segments[0];
	const hasSegments = segments.length > 0;
	const startsWithLocale = hasSegments && APPLICATION_LANGUAGES_CODE.includes(firstSegment);
	if (startsWithLocale) {
		return '/' + segments.slice(1).join('/');
	}
	return path;
}

/** Pages that draw a timer of their own, where the top bar shows the compact one only when the header is short. */
export function pathCarriesItsOwnTimer(path: string) {
	const normalizedPath = stripLocale(path);
	return PATH_WITH_MORE_THAN_ONE_TIMER.some((prefix: string) => {
		if (prefix === '/') {
			const isRoot = normalizedPath === '/' || normalizedPath === '';
			return isRoot;
		}
		return normalizedPath.startsWith(prefix);
	});
}
