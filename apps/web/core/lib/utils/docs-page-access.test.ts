import { isPageWithoutWriteAccess } from './docs-page-access';

describe('isPageWithoutWriteAccess (#5723)', () => {
	it('is true for a page the platform says the person may not change', () => {
		expect(isPageWithoutWriteAccess({ canWrite: false })).toBe(true);
	});

	it('is false for a page the person may change', () => {
		expect(isPageWithoutWriteAccess({ canWrite: true })).toBe(false);
	});

	it('is false when the platform does not say: the page opens as before', () => {
		expect(isPageWithoutWriteAccess({})).toBe(false);
		expect(isPageWithoutWriteAccess({ canWrite: undefined })).toBe(false);
	});
});
