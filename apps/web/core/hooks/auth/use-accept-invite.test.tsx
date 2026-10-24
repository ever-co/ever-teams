/**
 * @jest-environment jsdom
 *
 * Regression for the accept-invite validate loop (2026-08-17): the page effect depended on
 * callbacks that took the whole useMutation RESULT object as a dependency, so every mutation state
 * change (idle → pending → success) produced new callbacks → the effect re-ran → validated again →
 * … React #185 and ~50 POST /invite/validate-by-code in 6 s. Every invitee saw "Something went wrong".
 *
 * This drives the same hook + effect shape the page uses and asserts ONE validation per (code, email).
 */
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

const mockValidate = jest.fn();
const mockAccept = jest.fn();

jest.mock('@/core/services/client/api/organizations/teams/invites', () => ({
	inviteService: {
		validateInvitationByCodeAndEmail: (...a: unknown[]) => mockValidate(...a),
		validateInviteByTokenAndEmail: jest.fn(),
		acceptInvite: (...a: unknown[]) => mockAccept(...a)
	}
}));
jest.mock('@/core/hooks/invitations/use-invitation-invalidation', () => ({
	useInvitationInvalidation: () => ({ invalidateMyInvitations: jest.fn() })
}));
jest.mock('@/core/services/client/api/users/user-organization.service', () => ({ userOrganizationService: {} }));
jest.mock('@/core/services/client/api/organizations/teams/team.service', () => ({ organizationTeamService: {} }));
jest.mock('@/core/lib/helpers/cookies', () => ({ setAuthCookies: jest.fn() }));

// The zod schema modules import each other in a cycle (invite → user → organization-team → task →
// employee → user). Loading the barrel first (as the app does) sets a working evaluation order;
// importing the hook cold trips a TDZ ("Cannot access relationalUserSchema before initialization").
require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAcceptInvite } = require('./use-accept-invite') as typeof import('./use-accept-invite');

const RENDERS: number[] = [];

/** Mirrors AcceptInvitePageComponent's effect exactly (deps included). */
function Probe({ code, email, tick }: { code: string; email: string; tick: number }) {
	const { invitationState, validateInvitation, setInvitationState } = useAcceptInvite();
	RENDERS.push(tick);
	useEffect(() => {
		if (!code || !email) {
			setInvitationState({ state: 'FAILED' as never, loading: false, data: null, error: new Error('x') } as never);
			return;
		}
		validateInvitation({ code, email });
	}, [code, email, validateInvitation, setInvitationState]);
	return <div data-testid="state">{String((invitationState as { state: string }).state)}</div>;
}

function Harness() {
	const [tick, setTick] = useState(0);
	const bump = useRef<() => void>(() => undefined);
	bump.current = () => setTick((t) => t + 1);
	(globalThis as unknown as { __bump: () => void }).__bump = () => bump.current();
	return <Probe code="BNYGCTLF" email="et-e2e-invitee-1@ever.co" tick={tick} />;
}

describe('useAcceptInvite → validateInvitation', () => {
	beforeEach(() => {
		RENDERS.length = 0;
		mockValidate.mockReset();
		mockValidate.mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ email: 'x', organization: { name: 'o' } }), 5))
		);
	});

	it('validates exactly once for a given (code, email) even across mutation state changes and re-renders', async () => {
		const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const { getByTestId } = render(
			<QueryClientProvider client={qc}>
				<Harness />
			</QueryClientProvider>
		);

		await waitFor(() => expect(getByTestId('state').textContent?.toLowerCase()).toBe('validated'), { timeout: 3000 });

		// Force several parent re-renders after the mutation settled.
		for (let i = 0; i < 5; i++) {
			await act(async () => {
				(globalThis as unknown as { __bump: () => void }).__bump();
			});
		}
		await new Promise((r) => setTimeout(r, 50));

		expect(mockValidate).toHaveBeenCalledTimes(1);
		expect(mockValidate).toHaveBeenCalledWith({ code: 'BNYGCTLF', email: 'et-e2e-invitee-1@ever.co' });
		expect(RENDERS.length).toBeGreaterThan(5); // it did re-render — the point is that it did not re-validate
	});
});
