/**
 * @jest-environment jsdom
 *
 * MustBeAManager — regression for WEB-009 (2026-08-17): the guard used to decide as soon as the user
 * and teams QUERIES were no longer loading, but `isTeamManager` is derived from `activeTeam.members`,
 * a Jotai atom that an effect fills afterwards. For one render every manager looked like a
 * non-manager and /reports/* bounced them to "/". The guard must keep showing the skeleton until the
 * membership it judges by is actually there — and still redirect real non-managers.
 */
import { render, screen, act } from '@testing-library/react';

const mockReplace = jest.fn();
const auth = {
	user: null as null | { id: string; employee?: { id: string }; role?: { name: string } },
	userLoading: false,
	isTeamManager: false
};
const teamsQ = {
	getOrganizationTeamsLoading: false,
	teams: [] as unknown[],
	activeTeam: null as null | { members: unknown[] }
};
const SELF = { id: 'm-self', employee: { userId: 'u1' } };
const OTHER = { id: 'm-other', employee: { userId: 'u2' } };

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('@/core/hooks', () => ({ useAuthenticateUser: () => auth }));
jest.mock('@/core/hooks/organizations', () => ({ useOrganizationTeamsQuery: () => teamsQ }));
jest.mock('../common/global-skeleton', () => () => <div data-testid="skeleton" />);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MustBeAManager = require('./must-be-a-manager').default as typeof import('./must-be-a-manager').default;

function setState(next: {
	user?: { id: string; employee?: { id: string }; role?: { name: string } } | null;
	userLoading?: boolean;
	isTeamManager?: boolean;
	teamsLoading?: boolean;
	teams?: unknown[];
	activeTeam?: { members: unknown[] } | null;
}) {
	if ('user' in next) auth.user = next.user ?? null;
	if ('userLoading' in next) auth.userLoading = !!next.userLoading;
	if ('isTeamManager' in next) auth.isTeamManager = !!next.isTeamManager;
	if ('teamsLoading' in next) teamsQ.getOrganizationTeamsLoading = !!next.teamsLoading;
	if ('teams' in next) teamsQ.teams = next.teams ?? [];
	if ('activeTeam' in next) teamsQ.activeTeam = next.activeTeam ?? null;
}

describe('MustBeAManager', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockReplace.mockReset();
		setState({
			user: null,
			userLoading: false,
			isTeamManager: false,
			teamsLoading: false,
			teams: [],
			activeTeam: null
		});
	});
	afterEach(() => jest.useRealTimers());

	it('does NOT redirect while the user is unknown (teams query disabled ⇒ isLoading=false)', () => {
		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(screen.getByTestId('skeleton')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('does NOT redirect while teams exist but the active team members are not in state yet (the WEB-009 race)', () => {
		setState({ user: { id: 'u1' }, teams: [{ id: 't1' }], activeTeam: null, isTeamManager: false });
		const { rerender } = render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(screen.getByTestId('skeleton')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();

		// membership arrives → the user IS a manager → children render, still no redirect
		setState({ activeTeam: { members: [OTHER, SELF] }, isTeamManager: true });
		rerender(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(screen.getByText('child')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('keeps waiting while other members are loaded but the user\x27s own row is not (cold first load)', () => {
		setState({ user: { id: 'u1' }, teams: [{ id: 't1' }], activeTeam: { members: [OTHER] }, isTeamManager: false });
		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(screen.getByTestId('skeleton')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('redirects a real non-manager once membership is loaded', () => {
		setState({
			user: { id: 'u1' },
			teams: [{ id: 't1' }],
			activeTeam: { members: [OTHER, SELF] },
			isTeamManager: false
		});
		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(mockReplace).toHaveBeenCalledWith('/');
	});

	it('allows a global super admin who is not a member of the active team', () => {
		setState({
			user: { id: 'u1', role: { name: 'SUPER_ADMIN' } },
			teams: [{ id: 't1' }],
			activeTeam: { members: [OTHER] },
			isTeamManager: false
		});

		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);

		expect(screen.getByText('child')).toBeTruthy();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('a user with no teams is decided only after the bounded wait (the teams atom lags the query)', () => {
		setState({ user: { id: 'u1' }, teams: [], activeTeam: null, isTeamManager: false });
		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(mockReplace).not.toHaveBeenCalled();
		act(() => {
			jest.advanceTimersByTime(8100);
		});
		expect(mockReplace).toHaveBeenCalledWith('/');
	});

	it('gives up waiting after the bounded delay instead of pinning the skeleton forever', () => {
		setState({ user: { id: 'u1' }, teams: [{ id: 't1' }], activeTeam: null, isTeamManager: false });
		render(<MustBeAManager useRedirect>{<div>child</div>}</MustBeAManager>);
		expect(mockReplace).not.toHaveBeenCalled();
		act(() => {
			jest.advanceTimersByTime(8100);
		});
		expect(mockReplace).toHaveBeenCalledWith('/');
	});
});
