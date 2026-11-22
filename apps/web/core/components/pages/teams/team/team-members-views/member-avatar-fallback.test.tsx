/**
 * @jest-environment jsdom
 *
 * A member's avatar on the team page, in the card and in the block view: when the image fails to load (an address
 * that no longer answers, a host the image optimiser refuses), the circle shows the member's initial, as it does
 * without an image, never the browser's broken-image icon with "Team Avatar".
 */
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { I_MemberIdentityHook } from '@/core/hooks';
import { UserInfo } from './user-team-card/user-info';
import { UserBoxInfo } from './user-team-block/user-info';

jest.mock('jotai', () => ({
	...jest.requireActual('jotai'),
	useAtom: () => [{}, jest.fn()],
	useAtomValue: () => null
}));
jest.mock('@/core/stores', () => ({ avatarState: {}, timerStatusState: {} }));
jest.mock('@/core/components/timer/timer-status', () => ({
	getTimerStatusValue: () => 'idle',
	TimerStatus: () => null
}));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useTeamManagerRole: () => ({ isTeamCreator: false, isTeamManager: false })
}));
jest.mock('@/core/components/duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children: ReactNode }) => children
}));
jest.mock('@/core/components', () => {
	const Text = ({ children }: { children: ReactNode }) => <span>{children}</span>;
	Text.Heading = ({ children }: { children: ReactNode }) => <h3>{children}</h3>;
	return { Text };
});
jest.mock('@/core/components/icons', () => ({ Mail: () => null }));
jest.mock('@/core/components/icons/icons', () => ({ ManagerIcon: () => null, CreatorIcon: () => null }));

const kofi = {
	memberUser: {
		id: 'user-1',
		firstName: 'Kofi',
		lastName: 'Arden',
		email: 'kofi.arden@example.com',
		imageUrl: 'https://cdn.ever.co/avatars/gone.png'
	},
	member: { id: 'member-1' }
} as unknown as I_MemberIdentityHook;

describe.each([
	['card', UserInfo],
	['block', UserBoxInfo]
])("a member's avatar on the team page, %s view", (_view, MemberInfo) => {
	it('shows the initial when the image fails to load', () => {
		render(<MemberInfo memberInfo={kofi} />);

		fireEvent.error(screen.getByAltText('Team Avatar'));

		expect(screen.queryByAltText('Team Avatar')).toBeNull();
		expect(screen.getByText('K')).toBeTruthy();
	});
});
