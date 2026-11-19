import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import UserHeaderCard, { presenceIconXml } from './user-header-card';
import { presenceColorOf } from '../../../../../src/theme/presence';
import { onlineAndTrackingTimeAlternate } from '../../../../components/svgs/icons';
import { themeFor } from '../../../../../src/theme/use-theme';
import type { IUser } from '../../../../services/interfaces/IUserData';
import type { OT_Member } from '../../../../services/interfaces/IOrganizationTeam';

const mockPresence = { value: 'idle' };
const mockScheme = { value: 'light' as 'light' | 'dark' };

jest.mock('../../../../helpers/get-timer-status', () => ({ getTimerStatusValue: () => mockPresence.value }));
jest.mock('../../../../services/hooks/use-timer', () => ({ useTimer: () => ({ timerStatus: null }) }));
jest.mock('../../../../services/hooks/use-organization', () => ({
	useOrganizationTeam: () => ({ currentTeam: { members: [], public: false } })
}));
jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ colors: { primary: '#000' }, dark: false }),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor(mockScheme.value)
}));
const mockSvgXml = jest.fn();
jest.mock('react-native-svg', () => ({
	SvgXml: (props: unknown) => {
		mockSvgXml(props);
		return null;
	}
}));

const kofi = { id: 'user-kofi', name: 'Kofi Arden' } as unknown as IUser;
const member = { id: 'member-kofi' } as unknown as OT_Member;

function badgeStyle() {
	return StyleSheet.flatten(screen.getByTestId('presence-badge').props.style);
}

function fillStyle() {
	return StyleSheet.flatten(screen.getByTestId('presence-fill').props.style);
}

describe("a member's presence badge", () => {
	it('shows an idle member in muted gray, never in red', async () => {
		mockPresence.value = 'idle';
		mockScheme.value = 'light';
		await render(<UserHeaderCard user={kofi} member={member} />);

		expect(fillStyle().backgroundColor).toBe(presenceColorOf('idle', themeFor('light')));
		expect(fillStyle().backgroundColor).not.toBe('#F5BEBE');
		expect(badgeStyle().backgroundColor).toBe(themeFor('light').colors.card);
	});

	it('draws the presence icon in one light ink, so idle shows no red', () => {
		expect(presenceIconXml('<svg><circle fill="#E65B5B"/><path fill="none"/></svg>')).toBe(
			'<svg><circle fill="currentColor"/><path fill="none"/></svg>'
		);
	});

	it("writes the member's name in 14/500 in the foreground color", async () => {
		mockScheme.value = 'light';
		await render(<UserHeaderCard user={kofi} member={member} />);

		const name = StyleSheet.flatten(screen.getByText('Kofi Arden').props.style);
		expect(name.fontSize).toBe(14);
		expect(name.fontWeight).toBe('500');
		expect(name.color).toBe(themeFor('light').colors.foreground);
	});

	it('draws the working icon for a member whose timer runs, as for an online one', async () => {
		mockPresence.value = 'running';
		mockScheme.value = 'light';
		await render(<UserHeaderCard user={kofi} member={member} />);

		expect(fillStyle().backgroundColor).toBe(themeFor('light').colors.success);
		expect(mockSvgXml).toHaveBeenLastCalledWith(
			expect.objectContaining({ xml: presenceIconXml(onlineAndTrackingTimeAlternate) })
		);
	});

	it('rings the badge with the card color, so no white ring shows in dark mode', async () => {
		mockPresence.value = 'online';
		mockScheme.value = 'dark';
		await render(<UserHeaderCard user={kofi} member={member} />);

		expect(badgeStyle().borderColor).toBe(themeFor('dark').colors.card);
		expect(fillStyle().backgroundColor).toBe(themeFor('dark').colors.success);
	});
});
