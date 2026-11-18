// A browser ignores @property rules inside a shadow root: the page has to register the custom properties the kit's
// shadows, rings and transforms rely on. Their names all start with --ever-teams-tw-, so the registrations change
// nothing in the page's own styles.
const PROPERTY_RULE = /@property\s+[^{]+\{[^}]*\}/g;

const PAGE_STYLE_ATTRIBUTE = 'data-ever-teams-properties';

export interface KitStyles {
	// What the element's shadow root adopts: the kit's stylesheet without its @property rules.
	shadow: string;
	// The @property rules, for the page.
	page: string;
}

export function splitKitStyles(stylesheet: string): KitStyles {
	const registrations = stylesheet.match(PROPERTY_RULE) ?? [];
	return {
		shadow: stylesheet.replace(PROPERTY_RULE, ''),
		page: registrations.join('\n')
	};
}

// Once per page, however many elements it holds.
export function registerKitProperties(page: Document, registrations: string): void {
	const registered = page.head.querySelector(`style[${PAGE_STYLE_ATTRIBUTE}]`);
	if (registered) {
		return;
	}
	const style = page.createElement('style');
	style.setAttribute(PAGE_STYLE_ATTRIBUTE, '');
	style.textContent = registrations;
	page.head.appendChild(style);
}
