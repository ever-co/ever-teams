/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page-layout';

const mockSetActiveTimer = jest.fn();
const mockHeights = { header: 0, notice: 0 };
let mockHeightCalls = 0;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	usePathname: () => '/'
}));
// PageLayout measures the header first, then the notice's box
jest.mock('@/core/hooks/common', () => ({
	useElementHeight: () => {
		mockHeightCalls += 1;
		const isHeader = mockHeightCalls % 2 === 1;
		if (isHeader) {
			return mockHeights.header;
		}
		return mockHeights.notice;
	}
}));
jest.mock('@/core/hooks/common/use-active-timer', () => ({
	useActiveTimer: () => ({ activeTimer: false, setActiveTimer: mockSetActiveTimer })
}));
jest.mock('./global-header', () => ({
	__esModule: true,
	default: ({ notice }: { notice?: ReactNode }) => <div data-testid="global-header">{notice}</div>
}));
jest.mock('./page-content-scroller', () => ({
	PageContentScroller: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('./time-zone-notice', () => ({
	TimeZoneNotice: () => <div data-testid="time-zone-notice" />
}));

beforeEach(() => {
	mockSetActiveTimer.mockReset();
	mockHeights.header = 0;
	mockHeights.notice = 0;
	mockHeightCalls = 0;
});

/** What the timer rule decided: PageLayout hands setActiveTimer an updater of the previous value. */
function timerActivatedFromOff(): boolean {
	const updater = mockSetActiveTimer.mock.calls.at(-1)?.[0] as (previous: boolean) => boolean;
	return updater(false);
}

/** The time zone notice belongs to the header, between the top bar and the page's own toolbar band. */
describe('PageLayout time zone notice', () => {
	it('hands the notice to the header, never to the page content', () => {
		render(<PageLayout>page</PageLayout>);

		const notice = screen.getByTestId('time-zone-notice');
		expect(screen.getByTestId('global-header').contains(notice)).toBe(true);
		expect(notice.closest('main')).toBeNull();
	});

	it('also tells it on a pane surface, whose panes take the height left', () => {
		render(<PageLayout fill>page</PageLayout>);

		expect(screen.getByTestId('time-zone-notice')).toBeTruthy();
	});

	it('leaves public team pages and the not-found page alone', () => {
		const { rerender } = render(<PageLayout publicTeam>page</PageLayout>);
		expect(screen.queryByTestId('time-zone-notice')).toBeNull();

		rerender(<PageLayout notFound>page</PageLayout>);
		expect(screen.queryByTestId('time-zone-notice')).toBeNull();
	});

	it("leaves the notice's height out of the header the timer rule reads", () => {
		// The home page carries its own timer: the top bar adds the compact one only under a short header
		mockHeights.header = 150;
		mockHeights.notice = 80;

		render(<PageLayout>page</PageLayout>);

		expect(timerActivatedFromOff()).toBe(true);
	});

	it('keeps a tall page header tall when no notice shows', () => {
		mockHeights.header = 150;
		mockHeights.notice = 0;

		render(<PageLayout>page</PageLayout>);

		expect(timerActivatedFromOff()).toBe(false);
	});
});
