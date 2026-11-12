/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import {
	LibraryIcon,
	PROPERTY_ICON_CATALOG,
	PROPERTY_ICON_CATEGORIES,
	propertyIconEntryOf,
	propertyIconMatches
} from './property-icon-catalog';

describe('property icon catalog', () => {
	it('gives every icon its own stored key', () => {
		const keys = PROPERTY_ICON_CATALOG.map((item) => item.key);

		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) {
			expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
	});

	it('fills every category it shows', () => {
		for (const category of PROPERTY_ICON_CATEGORIES) {
			expect(PROPERTY_ICON_CATALOG.some((item) => item.category === category)).toBe(true);
		}
	});

	it('finds an icon by the start of its words, and every word of the query must match', () => {
		const done = propertyIconEntryOf('done')!;
		const bug = propertyIconEntryOf('bug')!;

		expect(propertyIconMatches(done, '')).toBe(true);
		expect(propertyIconMatches(done, 'fin')).toBe(true);
		expect(propertyIconMatches(done, 'Finished')).toBe(true);
		expect(propertyIconMatches(bug, 'defect fix')).toBe(true);
		expect(propertyIconMatches(bug, 'defect rocket')).toBe(false);
		expect(propertyIconMatches(done, 'ug')).toBe(false);
	});

	it('draws a known key and falls back for a key this version does not know', () => {
		const { container, rerender, getByText } = render(<LibraryIcon iconKey="done" className="size-4" />);
		expect(container.querySelector('svg')).not.toBeNull();

		rerender(<LibraryIcon iconKey="no-such-icon" fallback={<span>glyph</span>} />);
		expect(container.querySelector('svg')).toBeNull();
		expect(getByText('glyph')).toBeTruthy();
	});
});
