import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TintedIcon, tintIconXml } from './tinted-icon';

jest.mock('react-native-svg', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		SvgXml: ({ xml, color, testID }: { xml: string; color: string; testID: string }) =>
			createElement(View, { testID, xml, color })
	};
});

const IN_PROGRESS = '<svg fill="none"><path d="M1 1" stroke="#292D32" stroke-width="1.5"/></svg>';
const DONE = '<svg fill="none"><path fill="#292D32"/><path stroke="#FFFFFF"/></svg>';

describe("a chip's icon", () => {
	it("draws Gauzy's default ink in the chip's color", () => {
		expect(tintIconXml(IN_PROGRESS)).toBe(
			'<svg fill="none"><path d="M1 1" stroke="currentColor" stroke-width="1.5"/></svg>'
		);
	});

	it('keeps white details and the empty fill, so the check of "done" still shows', () => {
		expect(tintIconXml(DONE)).toBe('<svg fill="none"><path fill="currentColor"/><path stroke="#FFFFFF"/></svg>');
	});

	it('draws the fetched icon in the color it is given', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(IN_PROGRESS)
		}) as unknown as typeof fetch;

		await render(<TintedIcon uri="https://example.com/in-progress.svg" color="rgb(80, 72, 229)" size={14} />);

		const icon = await screen.findByTestId('tinted-icon');
		expect(icon.props.color).toBe('rgb(80, 72, 229)');
		expect(icon.props.xml).toContain('stroke="currentColor"');
	});

	it('does not keep an error page as the icon, and asks again on the next draw', async () => {
		const errorPage = { ok: false, status: 500, text: () => Promise.resolve('<html>Server error</html>') };
		const iconFile = { ok: true, status: 200, text: () => Promise.resolve(IN_PROGRESS) };
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce(errorPage)
			.mockResolvedValueOnce(iconFile) as unknown as typeof fetch;

		const first = await render(<TintedIcon uri="https://example.com/flaky.svg" color="red" size={14} />);
		expect(screen.getByTestId('tinted-icon-pending')).toBeTruthy();
		await first.unmount();

		await render(<TintedIcon uri="https://example.com/flaky.svg" color="red" size={14} />);

		expect((await screen.findByTestId('tinted-icon')).props.xml).toContain('currentColor');
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('never shows the previous icon for a new address whose file fails', async () => {
		const iconFile = { ok: true, status: 200, text: () => Promise.resolve(IN_PROGRESS) };
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce(iconFile)
			.mockRejectedValueOnce(new Error('offline')) as unknown as typeof fetch;

		const drawing = await render(<TintedIcon uri="https://example.com/a.svg" color="red" size={14} />);
		expect(await screen.findByTestId('tinted-icon')).toBeTruthy();

		await drawing.rerender(<TintedIcon uri="https://example.com/b.svg" color="red" size={14} />);

		expect(screen.getByTestId('tinted-icon-pending')).toBeTruthy();
		expect(screen.queryByTestId('tinted-icon')).toBeNull();
	});

	it('keeps its room empty when the file cannot be read', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

		await render(<TintedIcon uri="https://example.com/missing.svg" color="red" size={14} />);

		expect(screen.getByTestId('tinted-icon-pending')).toBeTruthy();
	});
});
