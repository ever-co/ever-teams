export function prefersReducedMotion(): boolean {
	const hasWindow = typeof window !== 'undefined';
	if (!hasWindow) {
		return false;
	}
	const query = window.matchMedia('(prefers-reduced-motion: reduce)');
	return query.matches;
}

export function scrollBehavior(): ScrollBehavior {
	if (prefersReducedMotion()) {
		return 'auto';
	}
	return 'smooth';
}
