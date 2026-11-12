import {
	PROPERTY_ICON_ACCEPT_ATTRIBUTE,
	PROPERTY_ICON_MAX_BYTES,
	propertyIconFileProblemOf,
	uploadPercentOf
} from './property-icon-upload';

describe('property icon upload rules', () => {
	it('takes the raster formats Gauzy accepts and every browser shows', () => {
		for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
			expect(propertyIconFileProblemOf({ type, size: 1024 })).toBeNull();
		}
		expect(PROPERTY_ICON_ACCEPT_ATTRIBUTE).toBe('image/png,image/jpeg,image/webp,image/gif');
	});

	it('refuses an SVG, which can carry script, and anything that is not an image', () => {
		expect(propertyIconFileProblemOf({ type: 'image/svg+xml', size: 1024 })).toBe('type');
		expect(propertyIconFileProblemOf({ type: 'image/bmp', size: 1024 })).toBe('type');
		expect(propertyIconFileProblemOf({ type: 'application/pdf', size: 1024 })).toBe('type');
		expect(propertyIconFileProblemOf({ type: '', size: 1024 })).toBe('type');
	});

	it('refuses an image over the size limit, and takes one exactly at it', () => {
		expect(propertyIconFileProblemOf({ type: 'image/png', size: PROPERTY_ICON_MAX_BYTES })).toBeNull();
		expect(propertyIconFileProblemOf({ type: 'image/png', size: PROPERTY_ICON_MAX_BYTES + 1 })).toBe('size');
	});

	it('tells how far an upload went in whole percents, and nothing while the total is unknown', () => {
		expect(uploadPercentOf({ loaded: 512, total: 2048 })).toBe(25);
		expect(uploadPercentOf({ loaded: 1, total: 3 })).toBe(33);
		expect(uploadPercentOf({ loaded: 4096, total: 2048 })).toBe(100);
		expect(uploadPercentOf({ loaded: 512 })).toBeNull();
		expect(uploadPercentOf({ loaded: 0, total: 0 })).toBeNull();
	});
});
