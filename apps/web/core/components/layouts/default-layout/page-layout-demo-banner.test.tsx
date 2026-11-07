/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page-layout';

const mockConfig = { demo: false };

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
jest.mock('@/core/constants/config/constants', () => ({
	APP_NAME: 'Ever Teams',
	APP_LINK: 'https://app.example.com',
	get IS_DEMO_MODE() {
		return mockConfig.demo;
	}
}));

/** PageLayout mounts the demo banner above the header: every app page shows it on a demo deployment. */
describe('PageLayout demo banner', () => {
	it('renders the banner above the header on a demo deployment', () => {
		mockConfig.demo = true;

		render(<PageLayout>page</PageLayout>);

		const banner = screen.getByTestId('demo-banner');
		const header = screen.getByTestId('global-header');
		expect(banner.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(screen.getByText('page')).toBeTruthy();
	});

	it('renders no banner anywhere else', () => {
		mockConfig.demo = false;

		render(<PageLayout>page</PageLayout>);

		expect(screen.queryByTestId('demo-banner')).toBeNull();
		expect(screen.getByTestId('global-header')).toBeTruthy();
	});
});
