/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskPropertyIcon } from './task-property-icon';
import {
	propertyIconFileUrl,
	propertyIconSourceOf
} from '@/core/components/settings/pages/task-properties/property-icon-image';
import { rememberUploadedIconPreview } from '@/core/lib/utils/uploaded-icon-preview';

const ASSET_ID = '5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a';
const KEY = 'uploads/task_property_icons/e1c2a3b4-5d6e-4f70-8a9b-0c1d2e3f4a5b/image-assets-1731340000-a1b2.png';
const SIGNED_URL = `https://bucket.s3.amazonaws.com/${KEY}?X-Amz-Signature=abc`;

const iconImage = (container: HTMLElement) => container.querySelector('img');
const glyph = (container: HTMLElement) => container.querySelector('[data-slot="task-property-icon"] svg');

describe('TaskPropertyIcon with a stored icon', () => {
	it('keeps the drawn glyph for a classic icon, which every seeded status has', () => {
		const { container } = render(
			<TaskPropertyIcon kind="status" name="open" color="#6366F1" icon="ever-icons/task-statuses/open.svg" />
		);

		expect(iconImage(container)).toBeNull();
		expect(glyph(container)).not.toBeNull();
	});

	it('draws a library icon in place of the glyph', async () => {
		const { container } = render(
			<TaskPropertyIcon kind="priority" name="urgent" color="#EF4444" icon="hugeicons:fire" />
		);

		await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
		expect(iconImage(container)).toBeNull();
	});

	it("loads a file of the user's own through the app, and falls back to the glyph when it fails", () => {
		const { container } = render(
			<TaskPropertyIcon kind="size" name="large" color="#22C55E" icon="uploads/icons/rocket.png" />
		);

		const image = iconImage(container);
		// The app's own origin: the image component may write the URL out in full
		const source = new URL(image?.getAttribute('src') ?? '', 'http://localhost');
		expect(source.pathname).toBe('/api/public-assets/uploads/icons/rocket.png');

		fireEvent.error(image!);

		expect(iconImage(container)).toBeNull();
		expect(glyph(container)).not.toBeNull();
	});

	it('loads an uploaded image Gauzy keeps on its own disk through the app', () => {
		const { container } = render(
			<TaskPropertyIcon
				kind="status"
				name="qa"
				icon={`image-asset:${ASSET_ID}:LOCAL:${KEY}`}
				iconUrl={`https://api.example.com/public/${KEY}`}
			/>
		);

		const source = new URL(iconImage(container)?.getAttribute('src') ?? '', 'http://localhost');
		expect(source.pathname).toBe(`/api/public-assets/${KEY}`);
	});

	it('loads an uploaded image held by S3 from the URL Gauzy signed, and falls back to the glyph when it fails', () => {
		const { container } = render(
			<TaskPropertyIcon
				kind="priority"
				name="high"
				icon={`image-asset:${ASSET_ID}:S3:${KEY}`}
				iconUrl={SIGNED_URL}
			/>
		);

		const image = iconImage(container);
		expect(image?.getAttribute('src')).toBe(SIGNED_URL);

		fireEvent.error(image!);

		expect(iconImage(container)).toBeNull();
		expect(glyph(container)).not.toBeNull();
	});

	it('keeps the glyph for an uploaded image Gauzy gave no URL for', () => {
		const { container } = render(
			<TaskPropertyIcon kind="size" name="large" icon={`image-asset:${ASSET_ID}:S3:${KEY}`} iconUrl={null} />
		);

		expect(iconImage(container)).toBeNull();
		expect(glyph(container)).not.toBeNull();
	});

	it('shows a new upload from the file the user picked until the property is saved', () => {
		URL.createObjectURL = jest.fn(() => 'blob:picked-file');
		rememberUploadedIconPreview(`image-asset:${ASSET_ID}`, new Blob(['png']));

		const { container } = render(<TaskPropertyIcon kind="status" name="qa" icon={`image-asset:${ASSET_ID}`} />);

		expect(iconImage(container)?.getAttribute('src')).toBe('blob:picked-file');
	});

	it('shows a label by its color only, whatever icon it stored', () => {
		const { container } = render(
			<TaskPropertyIcon kind="label" name="frontend" color="#0EA5E9" icon="uploads/icons/rocket.png" />
		);

		expect(iconImage(container)).toBeNull();
		expect(screen.queryByRole('img')).toBeNull();
	});
});

describe('propertyIconSourceOf', () => {
	it('loads an uploaded image kept on the Gauzy disk through the app, and one held elsewhere from its URL', () => {
		expect(propertyIconSourceOf(`image-asset:${ASSET_ID}:LOCAL:${KEY}`, 'https://api.example.com/x')).toBe(
			`/api/public-assets/${KEY}`
		);
		expect(propertyIconSourceOf(`image-asset:${ASSET_ID}:WASABI:${KEY}`, ` ${SIGNED_URL} `)).toBe(SIGNED_URL);
	});

	it('loads nothing for an uploaded image with no URL, nor from a URL that is not one', () => {
		expect(propertyIconSourceOf(`image-asset:${ASSET_ID}:S3:${KEY}`)).toBeNull();
		expect(propertyIconSourceOf(`image-asset:${ASSET_ID}:S3:${KEY}`, 'javascript:alert(1)')).toBeNull();
		expect(propertyIconSourceOf('image-asset:00000000-0000-4000-8000-000000000000')).toBeNull();
	});

	it('loads every other icon file as before', () => {
		expect(propertyIconSourceOf('uploads/icons/rocket.png')).toBe('/api/public-assets/uploads/icons/rocket.png');
		expect(propertyIconSourceOf('https://cdn.example.com/icon.png')).toBe('https://cdn.example.com/icon.png');
	});
});

describe('propertyIconFileUrl', () => {
	it('loads a Gauzy path through the app and keeps an absolute URL', () => {
		expect(propertyIconFileUrl('ever-icons/task-statuses/open.svg')).toBe(
			'/api/public-assets/ever-icons/task-statuses/open.svg'
		);
		expect(propertyIconFileUrl(' https://cdn.example.com/icon.png ')).toBe('https://cdn.example.com/icon.png');
	});
});
