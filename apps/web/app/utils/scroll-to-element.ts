export function scrollToElement(rect: DOMRect, diff = 150) {
	return window.scroll({
		top:
			rect.y > 0
				? rect.y + window.scrollY - diff
				: window.scrollY - Math.abs(rect.y) - diff,
		behavior: 'smooth'
	});
}
