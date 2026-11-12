type PreviewModule = typeof import('./uploaded-icon-preview');

// The previews live in the module, as they do in a page: each test gets a fresh module, as a fresh page would
async function freshPreviews(): Promise<PreviewModule> {
	jest.resetModules();
	return import('./uploaded-icon-preview');
}

describe('uploaded icon previews', () => {
	let created: number;
	let revoked: string[];

	beforeEach(() => {
		created = 0;
		revoked = [];
		URL.createObjectURL = jest.fn(() => `blob:preview-${++created}`);
		URL.revokeObjectURL = jest.fn((url: string) => {
			revoked.push(url);
		});
	});

	it('shows a new upload from the file the user picked until the property is saved', async () => {
		const { rememberUploadedIconPreview, uploadedIconPreviewOf } = await freshPreviews();

		rememberUploadedIconPreview('image-asset:one', new Blob(['png']));

		expect(uploadedIconPreviewOf('image-asset:one')).toBe('blob:preview-1');
		expect(uploadedIconPreviewOf(' image-asset:one ')).toBe('blob:preview-1');
		expect(uploadedIconPreviewOf('image-asset:two')).toBeNull();
		expect(uploadedIconPreviewOf(null)).toBeNull();
	});

	it('lets the file of a replaced preview go', async () => {
		const { rememberUploadedIconPreview, uploadedIconPreviewOf } = await freshPreviews();

		rememberUploadedIconPreview('image-asset:one', new Blob(['a']));
		rememberUploadedIconPreview('image-asset:one', new Blob(['b']));

		expect(uploadedIconPreviewOf('image-asset:one')).toBe('blob:preview-2');
		expect(revoked).toEqual(['blob:preview-1']);
	});

	it('keeps the twenty newest previews only', async () => {
		const { rememberUploadedIconPreview, uploadedIconPreviewOf } = await freshPreviews();

		for (let index = 1; index <= 21; index++) {
			rememberUploadedIconPreview(`image-asset:${index}`, new Blob([String(index)]));
		}

		expect(uploadedIconPreviewOf('image-asset:1')).toBeNull();
		expect(revoked).toEqual(['blob:preview-1']);
		expect(uploadedIconPreviewOf('image-asset:2')).toBe('blob:preview-2');
		expect(uploadedIconPreviewOf('image-asset:21')).toBe('blob:preview-21');
	});
});
