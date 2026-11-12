import { draftOfItem, propertyItemOf, propertyItemsOf } from './settings-task-properties';

const UPLOADED = 'image-asset:5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a:S3:uploads/task_property_icons/t/icon.png';
const SIGNED_URL = 'https://bucket.s3.amazonaws.com/uploads/task_property_icons/t/icon.png?X-Amz-Signature=abc';

describe('task property settings items', () => {
	it("keep Gauzy's URL of an uploaded icon next to the icon", () => {
		const item = propertyItemOf({ id: 'qa', name: 'qa', icon: UPLOADED, fullIconUrl: SIGNED_URL });

		expect(item.icon).toBe(UPLOADED);
		expect(item.iconUrl).toBe(SIGNED_URL);
	});

	it('have no icon URL when Gauzy gives none', () => {
		const [library, plain] = propertyItemsOf([
			{ id: 'done', name: 'done', icon: 'hugeicons:done', fullIconUrl: null },
			{ id: 'open', name: 'open' }
		]);

		expect(library.iconUrl).toBeNull();
		expect(plain.iconUrl).toBeNull();
	});

	it('hand the URL to the editor along with the icon it belongs to', () => {
		const item = propertyItemOf({
			id: 'qa',
			name: 'in-review',
			color: '#6366F1',
			icon: UPLOADED,
			fullIconUrl: SIGNED_URL
		});

		expect(draftOfItem(item)).toEqual({
			name: 'in review',
			color: '#6366F1',
			icon: UPLOADED,
			iconUrl: SIGNED_URL,
			template: null
		});
	});
});
