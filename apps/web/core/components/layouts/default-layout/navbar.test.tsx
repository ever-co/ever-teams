/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navbar } from './navbar';

jest.mock('jotai', () => ({
	atom: () => Symbol('atom'),
	useAtomValue: () => true
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ usePathname: () => '/en/profile/member-2' }));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'viewer' }, isLoading: false })
}));
jest.mock('@/core/stores', () => ({ isTeamMemberState: 'is-team-member', organizationTeamsState: 'teams' }));
jest.mock('@/core/components', () => ({
	Button: ({ children }: React.PropsWithChildren) => <button type="button">{children}</button>
}));
jest.mock('@/core/components/optimized-components/dashboard', () => ({
	LazyMinTimerFrame: () => <div data-testid="top-bar-timer" />,
	LazyCollaborate: () => null,
	LazyUserNavAvatar: () => null
}));
jest.mock('@/core/components/optimized-components/teams', () => ({
	LazyRequestToJoinModal: () => null,
	LazyTeamsDropDown: () => null
}));
jest.mock('@/core/components/notifications/inbox/notification-bell', () => ({ NotificationBell: () => null }));
jest.mock('@/core/components/whats-new/whats-new-button', () => ({ WhatsNewButton: () => null }));
jest.mock('./header/command-palette-trigger', () => ({ CommandPaletteTrigger: () => null }));
jest.mock('../../common/keyboard-shortcuts', () => ({ KeyboardShortcuts: () => null }));
jest.mock('@/core/components/common/skeleton/min-timer-skeleton', () => ({ MinTimerSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/user-nav-avatar-skeleton', () => ({ UserNavAvatarSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/teams-dropdown-skeleton', () => ({ TeamsDropDownSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/collaborate-skeleton', () => ({ CollaborateSkeleton: () => null }));
jest.mock('@/core/components/timer/tracking-off-notice', () => ({
	TrackingOffPill: () => <div data-testid="tracking-off" />
}));

describe('Navbar timer on a profile page', () => {
	it('draws the compact timer when the page asks for it', () => {
		render(<Navbar showTimer />);

		expect(screen.getByTestId('top-bar-timer')).toBeTruthy();
	});

	it('draws no timer when the page does not ask for it', () => {
		render(<Navbar showTimer={false} />);

		expect(screen.queryByTestId('top-bar-timer')).toBeNull();
	});
});

describe('Navbar, for a member whose tracking is off', () => {
	it('draws the reason in the timer slot', () => {
		render(<Navbar showTimer={false} showTrackingOff />);

		expect(screen.getByTestId('tracking-off')).toBeTruthy();
		expect(screen.queryByTestId('top-bar-timer')).toBeNull();
	});

	it('draws the timer, not the reason, whenever there is a timer to show', () => {
		render(<Navbar showTimer showTrackingOff />);

		expect(screen.getByTestId('top-bar-timer')).toBeTruthy();
		expect(screen.queryByTestId('tracking-off')).toBeNull();
	});

	it('draws no reason by default', () => {
		render(<Navbar showTimer={false} />);

		expect(screen.queryByTestId('tracking-off')).toBeNull();
	});
});
