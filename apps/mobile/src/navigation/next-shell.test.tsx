import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { runAsBuild } from '../../test/app-shell';
import { NextShellStack } from './next-shell';

jest.mock('./next-shell-build', () => jest.requireActual('../../test/app-shell').nextShellBuildStandIn);
jest.mock('expo-router', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return {
		Redirect: ({ href }: { href: string }) => createElement(Text, null, `redirect to ${href}`),
		Stack: () => createElement(Text, null, 'pages of the group')
	};
});

describe("the new app's pages without a screen yet", () => {
	it('show in builds of the new app', async () => {
		runAsBuild('next');

		await render(<NextShellStack />);

		expect(screen.getByText('pages of the group')).toBeTruthy();
	});

	it('open the team in the app people install, instead of an empty page', async () => {
		runAsBuild(undefined);

		await render(<NextShellStack />);

		expect(screen.getByText('redirect to /')).toBeTruthy();
	});
});
