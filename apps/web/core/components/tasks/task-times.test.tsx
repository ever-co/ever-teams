/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

let mockMember: Record<string, unknown> | undefined;
let mockSecondsWithoutTeam = 0;

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components', () => ({ Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p> }));
jest.mock('../duplicated-components/tooltip', () => ({ Tooltip: () => null }));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useActiveTeamMember: () => mockMember
}));
const mockUseTodaySecondsWithoutTeam = jest.fn();

jest.mock('@/core/hooks/organizations/teams/use-today-seconds-without-team', () => ({
	useTodaySecondsWithoutTeam: (employeeId: string) => {
		mockUseTodaySecondsWithoutTeam(employeeId);
		return mockSecondsWithoutTeam;
	}
}));

import { TodayWorkedTime } from './task-times';

describe('TodayWorkedTime', () => {
	it("adds the member's running time with no team to the time of their tasks in this team", () => {
		mockMember = {
			id: 'member-1',
			employeeId: 'employee-1',
			totalTodayTasks: [{ duration: 1800 }, { duration: 600 }]
		};
		mockSecondsWithoutTeam = 3600;

		render(<TodayWorkedTime isAuthUser={false} memberInfo={{ member: { id: 'member-1' } as never }} />);

		expect(screen.getByText('1h 40m')).toBeTruthy();
		expect(mockUseTodaySecondsWithoutTeam).toHaveBeenCalledWith('employee-1');
	});

	it('reads 0h 0m for a member with no time today', () => {
		mockMember = { id: 'member-1', employeeId: 'employee-1' };
		mockSecondsWithoutTeam = 0;

		render(<TodayWorkedTime isAuthUser={false} memberInfo={{ member: { id: 'member-1' } as never }} />);

		expect(screen.getByText('0h 0m')).toBeTruthy();
	});
});
