/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { readRememberedTeam, rememberTeam } from '@/core/lib/auth/remembered-team';
import { CONTINUE_TO_WORKSPACE_BUTTON_ID, useRememberedTeamContinue } from './use-remembered-team-continue';

const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));

const EMAIL = 'marie@acme.test';

function workspace(tenantName: string, teamIds: string[]): ISigninEmailConfirmWorkspaces {
	return {
		token: `token-${tenantName}`,
		user: { email: EMAIL, imageUrl: '', name: 'Marie', tenant: { name: tenantName, logo: '' } },
		current_teams: teamIds.map((teamId) => ({
			team_id: teamId,
			team_name: teamId,
			team_logo: '',
			team_member_count: '3',
			profile_link: '',
			prefix: null
		}))
	};
}

const workspaces = [workspace('Acme', ['design', 'ops']), workspace('Freelance', ['clients'])];

function mountContinueButton() {
	const button = document.createElement('button');
	button.id = CONTINUE_TO_WORKSPACE_BUTTON_ID;
	const onClick = jest.fn();
	button.addEventListener('click', onClick);
	document.body.appendChild(button);
	return onClick;
}

describe('useRememberedTeamContinue', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		window.localStorage.clear();
		document.body.innerHTML = '';
		mockToastError.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('presses Continue for the remembered team', () => {
		rememberTeam(EMAIL, 'clients');
		const onClick = mountContinueButton();

		const { result } = renderHook(() => useRememberedTeamContinue({ workspaces, email: EMAIL }));
		act(() => {
			jest.advanceTimersByTime(100);
		});

		expect(result.current.rememberedPick).toEqual({ workspaceIndex: 1, teamId: 'clients' });
		expect(result.current.autoContinue).toBe(true);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('gives the list back with the reason when that sign-in fails, and does not try that team again', () => {
		rememberTeam(EMAIL, 'clients');
		mountContinueButton();

		const { result } = renderHook(() => useRememberedTeamContinue({ workspaces, email: EMAIL }));
		act(() => {
			result.current.onContinueFailed({ response: { status: 401 } });
		});

		expect(result.current.autoContinue).toBe(false);
		expect(readRememberedTeam(EMAIL)?.teamId).toBeNull();
		expect(mockToastError).toHaveBeenCalledWith('pages.auth.WORKSPACE_OPEN_FAILED', {
			description: 'toasts.REASONS.SESSION'
		});
	});

	it('leaves the list on screen without a remembered team', () => {
		const onClick = mountContinueButton();

		const { result } = renderHook(() => useRememberedTeamContinue({ workspaces, email: EMAIL }));
		act(() => {
			jest.advanceTimersByTime(100);
		});

		expect(result.current.autoContinue).toBe(false);
		expect(onClick).not.toHaveBeenCalled();
	});

	it('still opens the only team of a single workspace', () => {
		const onClick = mountContinueButton();

		const { result } = renderHook(() =>
			useRememberedTeamContinue({ workspaces: [workspace('Acme', ['design'])], email: EMAIL })
		);
		act(() => {
			jest.advanceTimersByTime(100);
		});

		expect(result.current.autoContinue).toBe(true);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('leaves the pick to another rule when told to', () => {
		rememberTeam(EMAIL, 'clients');

		const { result } = renderHook(() =>
			useRememberedTeamContinue({ workspaces, email: EMAIL, rememberedTeamAllowed: false })
		);

		expect(result.current.rememberedPick).toBeNull();
		expect(result.current.autoContinue).toBe(false);
	});
});
