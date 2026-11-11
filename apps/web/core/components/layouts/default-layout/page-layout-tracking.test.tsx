/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { timerStatusState } from '@/core/stores/timer/timer';
import { userState } from '@/core/stores/user/user';
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
	default: ({ showTimer }: { showTimer: boolean }) => (
		<div data-testid="global-header" data-show-timer={String(showTimer)} />
	)
}));
jest.mock('./page-content-scroller', () => ({
	PageContentScroller: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	IS_DEMO_MODE: false
}));

/** The signed-in member, with their own (employee) tracking switch, and whether their timer runs. */
function storeWith({ employeeTracking, running = false }: { employeeTracking: boolean; running?: boolean }) {
	const store = createStore();
	const member = {
		id: 'member-a',
		isTrackingEnabled: true,
		employee: { userId: 'user-a', isTrackingEnabled: employeeTracking }
	};
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members: [member] }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(userState, { id: 'user-a' } as never);
	store.set(timerStatusState, { running } as never);
	return store;
}

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
