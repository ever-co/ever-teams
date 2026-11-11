/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskPropertyIcon } from './task-property-icon';
import { propertyIconFileUrl } from '@/core/components/settings/pages/task-properties/property-icon-image';

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

	it('shows a label by its color only, whatever icon it stored', () => {
		const { container } = render(
			<TaskPropertyIcon kind="label" name="frontend" color="#0EA5E9" icon="uploads/icons/rocket.png" />
		);

		expect(iconImage(container)).toBeNull();
		expect(screen.queryByRole('img')).toBeNull();
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
