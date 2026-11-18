import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getOrganizationTeamRequest } from '../../requests/organization-team';
import { useActiveTeamDetails } from './active-team-details';

jest.mock('../../requests/organization-team', () => ({
	getOrganizationTeamRequest: jest.fn(async () => ({ data: { id: 'team-1', name: 'Field Crew North' } }))
}));

const params = { tenantId: 'tenant-1', organizationId: 'organization-1', activeTeamId: 'team-1', authToken: 'token' };

function TeamName({ teams }: { teams: object }) {
	const team = useActiveTeamDetails({ ...params, teams });
	return <Text>{team?.name ?? 'loading'}</Text>;
}

function Screen({ teams }: { teams: object }) {
	return (
		<>
			{[1, 2, 3, 4, 5, 6].map((key) => (
				<TeamName key={key} teams={teams} />
			))}
		</>
	);
}

describe('useActiveTeamDetails', () => {
	beforeEach(() => {
		jest.mocked(getOrganizationTeamRequest).mockClear();
	});

	it('sends one request for every component showing the same teams answer', async () => {
		const client = new QueryClient();
		const teams = { items: [], total: 0 };

		const screen = await render(
			<QueryClientProvider client={client}>
				<Screen teams={teams} />
			</QueryClientProvider>
		);
		await screen.findAllByText('Field Crew North');

		expect(getOrganizationTeamRequest).toHaveBeenCalledTimes(1);
	});

	it('fetches again when the teams answer changes, and not when it stays the same', async () => {
		const client = new QueryClient();
		const first = { items: [], total: 0 };
		const screen = await render(
			<QueryClientProvider client={client}>
				<Screen teams={first} />
			</QueryClientProvider>
		);
		await screen.findAllByText('Field Crew North');

		await screen.rerender(
			<QueryClientProvider client={client}>
				<Screen teams={first} />
			</QueryClientProvider>
		);
		const changed = { items: [], total: 0 };
		await screen.rerender(
			<QueryClientProvider client={client}>
				<Screen teams={changed} />
			</QueryClientProvider>
		);
		await screen.findAllByText('Field Crew North');

		expect(getOrganizationTeamRequest).toHaveBeenCalledTimes(2);
	});
});
