/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { userState } from '@/core/stores/user/user';
import { storeWithSignedInMember as storeWith } from '@/test/tracking/signed-in-member';
import { PageLayout } from './page-layout';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
// A page without a timer of its own: the top bar shows the compact one there
jest.mock('next/navigation', () => ({
	usePathname: () => '/settings/personal'
}));
jest.mock('@/core/hooks/common', () => ({
	useElementHeight: () => 64
}));
jest.mock('@/core/hooks/common/use-active-timer', () => ({
	useActiveTimer: () => ({ activeTimer: true, setActiveTimer: jest.fn() })
}));
jest.mock('./global-header', () => ({
	__esModule: true,
	default: ({ showTimer, showTrackingOff }: { showTimer: boolean; showTrackingOff: boolean }) => (
		<div
			data-testid="global-header"
			data-show-timer={String(showTimer)}
			data-show-tracking-off={String(showTrackingOff)}
		/>
	)
}));
jest.mock('./page-content-scroller', () => ({
	PageContentScroller: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	IS_DEMO_MODE: false
}));

function headerTimerShown(store: ReturnType<typeof createStore>, showTimer?: boolean) {
	render(
		<Provider store={store}>
			<PageLayout showTimer={showTimer}>page</PageLayout>
		</Provider>
	);
	return screen.getByTestId('global-header').dataset.showTimer;
}

describe('PageLayout header timer', () => {
	it('shows the compact timer to a member who can track', () => {
		expect(headerTimerShown(storeWith({ employeeTracking: true }))).toBe('true');
	});

	it('shows no timer to a member whose tracking is off, even where the top bar adds one on its own', () => {
		expect(headerTimerShown(storeWith({ employeeTracking: false }))).toBe('false');
	});

	it('shows no timer to that member even when the page asks for one', () => {
		expect(headerTimerShown(storeWith({ employeeTracking: false }), true)).toBe('false');
	});

	it('keeps the timer while it runs, so it can still be stopped', () => {
		expect(headerTimerShown(storeWith({ employeeTracking: false, running: true }))).toBe('true');
	});
});

describe('PageLayout header, where the timer would be', () => {
	function header(store: ReturnType<typeof createStore>, showTimer?: boolean) {
		render(
			<Provider store={store}>
				<PageLayout showTimer={showTimer}>page</PageLayout>
			</Provider>
		);
		const { showTimer: timer, showTrackingOff: reason } = screen.getByTestId('global-header').dataset;
		return { timer, reason };
	}

	it('tells a member whose tracking is off why there is no timer', () => {
		expect(header(storeWith({ employeeTracking: false }))).toEqual({ timer: 'false', reason: 'true' });
	});

	it('tells nothing to a member who can track: they have the timer', () => {
		expect(header(storeWith({ employeeTracking: true }))).toEqual({ timer: 'true', reason: 'false' });
	});

	it('tells nothing while their timer runs: the timer stays, to be stopped', () => {
		expect(header(storeWith({ employeeTracking: false, running: true }))).toEqual({
			timer: 'true',
			reason: 'false'
		});
	});

	it('tells nothing in a team the user is not a member of', () => {
		const store = storeWith({ employeeTracking: false });
		store.set(userState, { id: 'user-outside' } as never);

		expect(header(store)).toEqual({ timer: 'false', reason: 'false' });
	});
});
