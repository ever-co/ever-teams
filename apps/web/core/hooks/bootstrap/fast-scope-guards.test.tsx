/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import type { PropsWithChildren } from 'react';

let teamId = '';
const getWorkingEmployees = jest.fn(async () => ({ items: [], total: 0 }));

jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	FAST_APP_BOOTSTRAP: { value: true }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getActiveTeamIdCookie: () => teamId,
	getAccessTokenCookie: () => 'access-token'
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'org-1' } }
	})
}));
jest.mock('@/core/services/client/api/organizations/teams', () => ({
	employeeService: { getWorkingEmployees }
}));
jest.mock('@/core/hooks/common', () => ({
	useFirstLoad: () => ({ firstLoadData: jest.fn() })
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useEmployee } =
	require('../organizations/employees/use-employee') as typeof import('../organizations/employees/use-employee');

describe('fast scope enable guards', () => {
	beforeEach(() => {
		teamId = '';
		getWorkingEmployees.mockClear();
	});

	it('does not fetch employees until tenant, organization, team, user and token are all captured', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>
				<JotaiProvider store={store}>{children}</JotaiProvider>
			</QueryClientProvider>
		);
		const { rerender } = renderHook(
			({ tick }) => {
				void tick;
				return useEmployee();
			},
			{ wrapper, initialProps: { tick: 0 } }
		);

		expect(getWorkingEmployees).not.toHaveBeenCalled();

		teamId = 'team-1';
		rerender({ tick: 1 });
		await waitFor(() => expect(getWorkingEmployees).toHaveBeenCalledTimes(1));
		expect(getWorkingEmployees).toHaveBeenCalledWith('team-1', {
			scope: {
				tenantId: 'tenant-1',
				organizationId: 'org-1',
				teamId: 'team-1',
				userId: 'user-1',
				accessToken: 'access-token'
			},
			signal: expect.any(AbortSignal)
		});
	});
});
