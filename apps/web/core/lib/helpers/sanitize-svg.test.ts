/**
 * @jest-environment jsdom
 */
import { sanitizeSvg } from './sanitize-svg';

/**
 * The settings chips (task statuses, priorities, sizes, labels, versions) fetch their icon from a URL a team member
 * chose and insert it as markup. Only drawing markup may reach the page.
 */
describe('sanitizeSvg', () => {
	/** The sanitized markup, parsed back: what the page would actually hold. */
	const parse = (markup: string) => {
		const container = document.createElement('div');
		container.innerHTML = markup;
		return container;
	};
	const attributesOf = (root: Element) =>
		[root, ...Array.from(root.querySelectorAll('*'))].flatMap((element) =>
			Array.from(element.attributes).map((attribute) => attribute.name.toLowerCase())
		);

	it('keeps an icon as it is drawn', () => {
		const icon =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">' +
			'<g><path d="M12 2v20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
			'<circle cx="12" cy="12" r="3" fill="currentColor"/></g></svg>';

		const container = parse(sanitizeSvg(icon));

		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(container.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
		expect(container.querySelector('path')?.getAttribute('stroke-width')).toBe('1.5');
		expect(container.querySelector('circle')).not.toBeNull();
	});

	it.each([
		[
			'an event handler on the root',
			'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>'
		],
		['an event handler on a shape', '<svg><path d="M0 0" onmouseover="alert(1)"/></svg>'],
		['a script element', '<svg><script>alert(1)</script><path d="M0 0"/></svg>'],
		['embedded HTML', '<svg><foreignObject><img src="x" onerror="alert(1)"></foreignObject><path d="M0 0"/></svg>'],
		['a javascript: link', '<svg><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>'],
		['an external use', '<svg><use href="https://attacker.example/icons.svg#payload"/></svg>'],
		[
			'an animation that rewrites a link',
			'<svg><a><animate attributeName="href" to="javascript:alert(1)"/><path d="M0 0"/></a></svg>'
		],
		['a set element', '<svg><set attributeName="onmouseover" to="alert(1)"/></svg>'],
		['a page-wide style', '<svg><style>body { display: none }</style><path d="M0 0"/></svg>'],
		['HTML instead of SVG', '<img src="x" onerror="alert(1)">']
	])('removes %s', (_label, payload) => {
		const container = parse(sanitizeSvg(payload));

		expect(attributesOf(container).filter((name) => name.startsWith('on'))).toEqual([]);
		expect(attributesOf(container)).not.toContain('href');
		expect(attributesOf(container)).not.toContain('xlink:href');
		expect(
			container.querySelector('script, foreignObject, foreignobject, img, a, use, animate, set, style')
		).toBeNull();
		expect(container.innerHTML).not.toMatch(/alert\(1\)|javascript:/);
	});
});
