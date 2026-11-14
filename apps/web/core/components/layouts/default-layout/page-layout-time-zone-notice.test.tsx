/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page-layout';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	usePathname: () => '/'
}));
jest.mock('@/core/hooks/common', () => ({
	useElementHeight: () => 0
}));
jest.mock('@/core/hooks/common/use-active-timer', () => ({
	useActiveTimer: () => ({ activeTimer: false, setActiveTimer: jest.fn() })
}));
jest.mock('./global-header', () => ({
	__esModule: true,
	default: () => <div data-testid="global-header" />
}));
jest.mock('./page-content-scroller', () => ({
	PageContentScroller: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('./time-zone-notice', () => ({
	TimeZoneNotice: () => <div data-testid="time-zone-notice" />
}));

/** The time zone notice opens the content of an ordinary page, under the top bar and above what the page shows. */
describe('PageLayout time zone notice', () => {
	it('sits at the top of the page content, under the header', () => {
		render(<PageLayout>page</PageLayout>);

		const notice = screen.getByTestId('time-zone-notice');
		const header = screen.getByTestId('global-header');
		const content = screen.getByText('page');
		expect(header.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(notice.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(notice.closest('main')).not.toBeNull();
	});

	it('leaves pane surfaces, public team pages and the not-found page alone', () => {
		const { rerender } = render(<PageLayout fill>page</PageLayout>);
		expect(screen.queryByTestId('time-zone-notice')).toBeNull();

		rerender(<PageLayout publicTeam>page</PageLayout>);
		expect(screen.queryByTestId('time-zone-notice')).toBeNull();

		rerender(<PageLayout notFound>page</PageLayout>);
		expect(screen.queryByTestId('time-zone-notice')).toBeNull();
	});
});
