import React from 'react';
import { render } from '@testing-library/react-native';
import en from '../../i18n/en';
import { ErrorDetails } from './error-details';

// screen.tsx has type errors of its own on develop, which ts-jest would report here; the layout is not under test.
jest.mock('../../components/screen', () => ({
	Screen: ({ children }: { children: React.ReactNode }) => children
}));

const failure = { error: new Error('Something broke inside'), errorInfo: { componentStack: '\n    at Somewhere' } };

describe('ErrorDetails', () => {
	const developmentBuild = __DEV__;

	afterEach(() => {
		(global as unknown as { __DEV__: boolean }).__DEV__ = developmentBuild;
	});

	it('keeps the error and its stack out of a release build', async () => {
		(global as unknown as { __DEV__: boolean }).__DEV__ = false;

		const screen = await render(<ErrorDetails {...failure} onReset={jest.fn()} />);

		expect(screen.queryByText('Error: Something broke inside')).toBeNull();
		expect(screen.queryByText('at Somewhere')).toBeNull();
	});

	it('shows the error to a developer', async () => {
		(global as unknown as { __DEV__: boolean }).__DEV__ = true;

		const screen = await render(<ErrorDetails {...failure} onReset={jest.fn()} />);

		expect(screen.getByText('Error: Something broke inside')).toBeTruthy();
	});

	it('tells people what to do, not where the boilerplate keeps its files', () => {
		expect(en.errorScreen.friendlySubtitle).not.toMatch(/app\/|ErrorBoundary|customize/i);
	});
});
