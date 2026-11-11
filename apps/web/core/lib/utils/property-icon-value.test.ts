import {
	classicIconGlyphOf,
	isClassicIcon,
	isCustomIcon,
	isIconUrl,
	libraryIconKeyOf,
	libraryIconValue
} from './property-icon-value';

describe('property icon values', () => {
	it('stores a library icon under its key and reads the key back', () => {
		expect(libraryIconValue('done')).toBe('hugeicons:done');
		expect(libraryIconKeyOf('hugeicons:done')).toBe('done');
		expect(libraryIconKeyOf('  hugeicons:in-progress  ')).toBe('in-progress');
	});

	it('reads no library key from other values', () => {
		expect(libraryIconKeyOf('hugeicons:')).toBeNull();
		expect(libraryIconKeyOf('ever-icons/task-statuses/open.svg')).toBeNull();
		expect(libraryIconKeyOf(null)).toBeNull();
		expect(libraryIconKeyOf(undefined)).toBeNull();
	});

	it('tells a classic icon from the others, with or without a leading slash', () => {
		expect(isClassicIcon('ever-icons/task-statuses/open.svg')).toBe(true);
		expect(isClassicIcon('/ever-icons/task-sizes/large.svg')).toBe(true);
		expect(isClassicIcon('uploads/icons/rocket.png')).toBe(false);
		expect(isClassicIcon('hugeicons:done')).toBe(false);
		expect(isClassicIcon('')).toBe(false);
	});

	it('reads the glyph a classic icon is drawn as, and none for other values', () => {
		expect(classicIconGlyphOf('ever-icons/task-statuses/in-progress.svg')).toEqual({
			kind: 'status',
			name: 'in-progress'
		});
		expect(classicIconGlyphOf('/ever-icons/task-sizes/x-large.svg')).toEqual({ kind: 'size', name: 'x-large' });
		expect(classicIconGlyphOf('ever-icons/task-priorities/urgent.svg')).toEqual({
			kind: 'priority',
			name: 'urgent'
		});
		expect(classicIconGlyphOf('ever-icons/unknown-group/open.svg')).toBeNull();
		expect(classicIconGlyphOf('hugeicons:done')).toBeNull();
		expect(classicIconGlyphOf(null)).toBeNull();
	});

	it('recognizes an absolute icon URL', () => {
		expect(isIconUrl('https://cdn.example.com/icon.png')).toBe(true);
		expect(isIconUrl('http://localhost:3000/public/ever-icons/task-statuses/open.svg')).toBe(true);
		expect(isIconUrl('ever-icons/task-statuses/open.svg')).toBe(false);
	});

	it('counts library icons and files of the user own as custom, never a classic icon or nothing', () => {
		expect(isCustomIcon('hugeicons:bug')).toBe(true);
		expect(isCustomIcon('uploads/icons/rocket.png')).toBe(true);
		expect(isCustomIcon('https://cdn.example.com/icon.png')).toBe(true);
		expect(isCustomIcon('ever-icons/task-priorities/high.svg')).toBe(false);
		expect(isCustomIcon('   ')).toBe(false);
		expect(isCustomIcon(null)).toBe(false);
	});
});
