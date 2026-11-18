import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return {
		Redirect: ({ href }: { href: string }) => createElement(Text, null, `redirect to ${href}`),
		Stack: () => createElement(Text, null, 'pages of the group')
	};
});

/** The module as a build with this EXPO_PUBLIC_APP_SHELL loads it. */
function nextShellOfBuild(appShell: string | undefined): typeof import('./next-shell') {
	let loaded: typeof import('./next-shell') | undefined;
	const previous = process.env.EXPO_PUBLIC_APP_SHELL;
	process.env.EXPO_PUBLIC_APP_SHELL = appShell;
	jest.isolateModules(() => {
		loaded = jest.requireActual('./next-shell');
	});
	process.env.EXPO_PUBLIC_APP_SHELL = previous;
	if (!loaded) {
		throw new Error('next-shell did not load');
	}
	return loaded;
}

describe("the new app's pages without a screen yet", () => {
	it('show in builds of the new app', async () => {
		const { NextShellStack } = nextShellOfBuild('next');

		await render(<NextShellStack />);

		expect(screen.getByText('pages of the group')).toBeTruthy();
	});

	it('open the team in the app people install, instead of an empty page', async () => {
		const { NextShellStack } = nextShellOfBuild(undefined);

		await render(<NextShellStack />);

		expect(screen.getByText('redirect to /')).toBeTruthy();
	});
});
