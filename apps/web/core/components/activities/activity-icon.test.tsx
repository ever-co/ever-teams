/** @jest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { ActivityIcon } from './activity-icon';

describe('ActivityIcon', () => {
	const saved = process.env.NEXT_PUBLIC_FAVICONS_ENABLED;

	afterEach(() => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = saved;
	});

	it("draws a common app's own mark in its colour, without any request", () => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = 'true';
		const { container } = render(<ActivityIcon title="Figma" kind="app" />);

		const mark = container.querySelector('svg');
		expect(mark).not.toBeNull();
		expect(mark?.getAttribute('style') ?? '').toContain('color: rgb(242, 78, 30)');
		expect(container.querySelector('img')).toBeNull();
	});

	it('draws Cursor with its own cube, which the icon sets lack', () => {
		const { container } = render(<ActivityIcon title="Cursor" kind="app" />);

		const mark = container.querySelector('svg');
		expect(mark?.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(mark?.querySelectorAll('path')).toHaveLength(3);
		expect(mark?.getAttribute('style') ?? '').toContain('color: rgb(0, 0, 0)');
	});

	it("shows an unknown site's favicon through the app's route, where the deployment allows it", () => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = 'true';
		const { container } = render(<ActivityIcon title="Docs" kind="url" url="https://docs.example.org/start" />);

		const image = container.querySelector('img');
		expect(image?.getAttribute('src')).toBe('/api/favicons/docs.example.org');
		expect(image?.getAttribute('alt')).toBe('');
		expect(image?.getAttribute('loading')).toBe('lazy');
	});

	it('gives way to a generic icon when the favicon fails, and never asks for it again', () => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = 'true';
		const first = render(<ActivityIcon title="broken.example.net" />);
		fireEvent.error(first.container.querySelector('img') as HTMLImageElement);

		expect(first.container.querySelector('img')).toBeNull();
		expect(first.container.querySelector('svg')).not.toBeNull();

		const second = render(<ActivityIcon title="broken.example.net" />);
		expect(second.container.querySelector('img')).toBeNull();
	});

	it('shows a generic icon, and asks nothing, while favicons are off', () => {
		delete process.env.NEXT_PUBLIC_FAVICONS_ENABLED;
		const site = render(<ActivityIcon title="example.org" />);
		const app = render(<ActivityIcon title="Some Internal Tool" />);

		expect(site.container.querySelector('img')).toBeNull();
		expect(site.container.querySelector('svg')).not.toBeNull();
		expect(app.container.querySelector('img')).toBeNull();
		expect(app.container.querySelector('svg')).not.toBeNull();
	});
});
