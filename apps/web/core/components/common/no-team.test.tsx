/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

let mockUser: Record<string, unknown> | undefined;
const mockOpenModal = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('jotai', () => ({
	...jest.requireActual('jotai'),
	useAtomValue: () => []
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, closeModal: jest.fn(), openModal: mockOpenModal })
}));
jest.mock('@/core/components', () => ({
	Button: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
	Text: { Heading: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }
}));
jest.mock('../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('../features/teams/create-team-modal', () => ({ CreateTeamModal: () => null }));
jest.mock('@/assets/svg', () => ({ NoTeamIcon: () => null }));

import NoTeam from './no-team';

describe('NoTeam', () => {
	beforeEach(() => {
		mockOpenModal.mockReset();
	});

	it('offers to create a team to a user with a member profile, as before', () => {
		mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1' } };

		render(<NoTeam />);

		expect(screen.getByText('common.NO_TEAM')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'common.CREATE_TEAM' })).toBeTruthy();
		expect(mockOpenModal).toHaveBeenCalled();
	});

	// ever-co/ever-teams#5678: a team she creates would not make her a member, so she is told what she misses and whom to ask
	it('tells a user without a member profile what is missing and what to do, without offering a team', () => {
		mockUser = { id: 'user-1', isEmailVerified: true };

		render(<NoTeam />);

		expect(screen.getByText('dashboard.calendar.NO_MEMBER_TITLE')).toBeTruthy();
		expect(screen.getByText('common.NO_MEMBER_PROFILE_MESSAGE')).toBeTruthy();
		expect(screen.queryByText('common.CREATE_TEAM')).toBeNull();
		expect(mockOpenModal).not.toHaveBeenCalled();
	});
});
