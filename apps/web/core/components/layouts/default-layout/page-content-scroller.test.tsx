/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { PageContentScroller } from './page-content-scroller';

describe('PageContentScroller', () => {
	it('owns vertical page scrolling and keeps the footer in normal document flow', () => {
		render(
			<PageContentScroller footer={<footer>Application footer</footer>}>
				<section>Page content</section>
			</PageContentScroller>
		);

		const scrollOwner = screen.getByTestId('page-scroll-owner');
		expect(scrollOwner.getAttribute('data-page-scroll-owner')).toBe('true');
		expect(scrollOwner.className).toContain('overflow-y-auto');
		expect(scrollOwner.contains(screen.getByText('Page content'))).toBe(true);
		expect(scrollOwner.contains(screen.getByText('Application footer'))).toBe(true);
		expect(screen.getByText('Page content').compareDocumentPosition(screen.getByText('Application footer'))).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});
});
