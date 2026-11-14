/** @jest-environment jsdom */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import GlobalHeader from './global-header';

jest.mock('.', () => ({
	Navbar: () => <nav data-testid="navbar" />
}));
jest.mock('./main-sidebar-trigger', () => ({
	__esModule: true,
	default: () => null
}));

function isBefore(first: Element, second: Element): boolean {
	return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('GlobalHeader notice', () => {
	it('places the notice under the top bar and above the toolbar band', () => {
		render(
			<GlobalHeader
				mainHeaderSlot={<div data-testid="toolbar-band" />}
				notice={<div data-testid="page-notice" />}
			/>
		);

		const bar = screen.getByRole('banner');
		const notice = screen.getByTestId('page-notice');
		const band = screen.getByTestId('toolbar-band');
		expect(isBefore(bar, notice)).toBe(true);
		expect(isBefore(notice, band)).toBe(true);
	});

	it('measures a notice box without padding of its own, so the whole notice leaves the header height', () => {
		const noticeRef = createRef<HTMLDivElement>();

		render(<GlobalHeader mainHeaderSlot={null} notice={<div data-testid="page-notice" />} noticeRef={noticeRef} />);

		const measured = noticeRef.current;
		expect(measured).not.toBeNull();
		// ResizeObserver's contentRect leaves padding out: padding on the measured box would stay in the header
		// cspell:disable-next-line -- the padding utilities p, pt, pr, pb, pl, px and py
		expect(measured?.className ?? '').not.toMatch(/(^|\s)p[trblxy]?-/);
		expect(measured?.contains(screen.getByTestId('page-notice'))).toBe(true);
	});

	it('adds nothing without a notice', () => {
		const { container } = render(<GlobalHeader mainHeaderSlot={null} />);

		expect(container.querySelector('[data-slot="header-notice"]')).toBeNull();
	});
});
