import {
	classicIconGlyphOf,
	gauzyDiskIconKeyOf,
	isClassicIcon,
	isCustomIcon,
	isIconUrl,
	isUploadedIcon,
	libraryIconKeyOf,
	libraryIconValue,
	uploadedIconOf,
	uploadedIconValue
} from './property-icon-value';

const ASSET_ID = '5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a';
const TENANT_ID = 'e1c2a3b4-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const KEY = `uploads/task_property_icons/${TENANT_ID}/image-assets-1731340000-a1b2.png`;

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

	it('names an uploaded image by its image asset, as the app sends it', () => {
		expect(uploadedIconValue(ASSET_ID)).toBe(`image-asset:${ASSET_ID}`);
		expect(uploadedIconOf(`image-asset:${ASSET_ID}`)).toEqual({
			assetId: ASSET_ID,
			storageProvider: null,
			key: null
		});
	});

	it('reads the provider and the key Gauzy completes an uploaded image with', () => {
		expect(uploadedIconOf(` image-asset:${ASSET_ID}:S3:${KEY} `)).toEqual({
			assetId: ASSET_ID,
			storageProvider: 'S3',
			key: KEY
		});
		expect(uploadedIconOf(`image-asset:${ASSET_ID}:CLOUDINARY:icons/a:b.png`)?.key).toBe('icons/a:b.png');
	});

	it('reads no uploaded image from other values', () => {
		expect(uploadedIconOf('hugeicons:done')).toBeNull();
		expect(uploadedIconOf('image-asset:')).toBeNull();
		expect(uploadedIconOf(null)).toBeNull();
		expect(isUploadedIcon('uploads/icons/rocket.png')).toBe(false);
		expect(isUploadedIcon(`image-asset:${ASSET_ID}`)).toBe(true);
	});

	it('gives the key of an uploaded image only when Gauzy keeps the file on its own disk', () => {
		expect(gauzyDiskIconKeyOf(`image-asset:${ASSET_ID}:LOCAL:${KEY}`)).toBe(KEY);
		expect(gauzyDiskIconKeyOf(`image-asset:${ASSET_ID}:S3:${KEY}`)).toBeNull();
		expect(gauzyDiskIconKeyOf(`image-asset:${ASSET_ID}`)).toBeNull();
		expect(gauzyDiskIconKeyOf(KEY)).toBeNull();
	});

	it('counts library icons and files of the user own as custom, never a classic icon or nothing', () => {
		expect(isCustomIcon('hugeicons:bug')).toBe(true);
		expect(isCustomIcon(`image-asset:${ASSET_ID}`)).toBe(true);
		expect(isCustomIcon('uploads/icons/rocket.png')).toBe(true);
		expect(isCustomIcon('https://cdn.example.com/icon.png')).toBe(true);
		expect(isCustomIcon('ever-icons/task-priorities/high.svg')).toBe(false);
		expect(isCustomIcon('   ')).toBe(false);
		expect(isCustomIcon(null)).toBe(false);
	});
});
