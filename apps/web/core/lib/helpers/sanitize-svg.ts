import DOMPurify from 'dompurify';

/**
 * Elements an icon never needs, refused on top of DOMPurify's SVG profile: `use` and `image` load other documents, the
 * animation elements can rewrite an attribute after sanitizing, and a `style` element is CSS for the whole page.
 */
const FORBIDDEN_TAGS = [
	'use',
	'image',
	'a',
	'foreignObject',
	'animate',
	'animateMotion',
	'animateTransform',
	'set',
	'style'
];

/**
 * The markup of an SVG icon, reduced to drawing: no script, no event handler, no embedded HTML, no link to another
 * document. Empty outside the browser (DOMPurify needs a DOM).
 *
 * The icons of task statuses, priorities, sizes, labels and versions are fetched from a URL a team member chose and
 * inserted into the page as markup, so a `<svg onload=...>` hosted anywhere ran in every teammate's session.
 *
 * @param svg - The SVG document's text.
 * @returns Markup safe to insert with `innerHTML`.
 */
export function sanitizeSvg(svg: string): string {
	if (typeof window === 'undefined' || typeof svg !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(svg, {
		USE_PROFILES: { svg: true, svgFilters: true },
		FORBID_TAGS: FORBIDDEN_TAGS,
		FORBID_ATTR: ['href', 'xlink:href']
	});
}
