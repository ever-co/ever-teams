import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TodayWorkedTime } from './today-work-time';
import type { I_TeamMemberCardHook } from '../../../../services/hooks/features/use-team-member-card';

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('light')
}));

jest.mock('../../../../i18n', () => ({ translate: (key: string) => key }));

jest.mock('../../../../services/hooks/use-timer', () => ({
	useLiveTimerStatus: () => ({ time: { h: 1, m: 9 } })
}));

const memberInfo = {} as I_TeamMemberCardHook;

describe("the total time on a member's card", () => {
	it.each([true, false])(
		'takes its own height, never a share of the row that would stretch the card (own card: %s)',
		async (isAuthUser) => {
			await render(<TodayWorkedTime isAuthUser={isAuthUser} memberInfo={memberInfo} />);

			const style = StyleSheet.flatten(screen.getByTestId('today-work-time').props.style);

			expect(style.height).toBeUndefined();
			expect(style.alignItems).toBe('center');
		}
	);

	it("shows the person's own time today", async () => {
		await render(<TodayWorkedTime isAuthUser memberInfo={memberInfo} />);

		expect(screen.getByText('01 h:09 m')).toBeTruthy();
	});
});
