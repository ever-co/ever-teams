import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { runAsBuild } from '../../test/app-shell';
import { NextShellHeartbeat } from './next-shell-heartbeat';

jest.mock('../navigation/next-shell-build', () => jest.requireActual('../../test/app-shell').nextShellBuildStandIn);
jest.mock('./run-heartbeat', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return { RunHeartbeat: () => createElement(Text, null, 'heartbeat') };
});
jest.mock('../data/query-client', () => {
	const { QueryClient } = jest.requireActual('@tanstack/react-query');
	return { queryClient: new QueryClient() };
});

describe("the new app's heartbeat", () => {
	it('runs in builds of the new app', async () => {
		runAsBuild('next');

		await render(<NextShellHeartbeat />);

		expect(screen.getByText('heartbeat')).toBeTruthy();
	});

	it('stays out of the app people install, where the current screens write the running time', async () => {
		runAsBuild(undefined);

		await render(<NextShellHeartbeat />);

		expect(screen.queryByText('heartbeat')).toBeNull();
	});
});
