import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { reloadAppAsync } from 'expo';
import ar from '../../../locales/ar.json';
import bg from '../../../locales/bg.json';
import en from '../../../locales/en.json';
import es from '../../../locales/es.json';
import fr from '../../../locales/fr.json';
import he from '../../../locales/he.json';
import ko from '../../../locales/ko.json';
import ru from '../../../locales/ru.json';
import { ErrorDetails } from './error-details';

// screen.tsx has type errors of its own on develop, which ts-jest would report here; the layout is not under test.
jest.mock('../../components/screen', () => ({
	Screen: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));

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

	it('reloads the whole app from its button', async () => {
		const onReset = jest.fn();
		const screen = await render(<ErrorDetails {...failure} onReset={onReset} />);

		await act(async () => {
			fireEvent.press(screen.getByRole('button'));
		});

		expect(reloadAppAsync).toHaveBeenCalledTimes(1);
		expect(onReset).not.toHaveBeenCalled();
	});

	it('clears the error when the app cannot reload', async () => {
		jest.mocked(reloadAppAsync).mockRejectedValueOnce(new Error('no reload in this host'));
		const onReset = jest.fn();
		const screen = await render(<ErrorDetails {...failure} onReset={onReset} />);

		await act(async () => {
			fireEvent.press(screen.getByRole('button'));
		});

		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('says what happened in each language the app has', () => {
		const translated = { ar, bg, es, fr, he, ko, ru };
		for (const [locale, messages] of Object.entries(translated)) {
			const { title, friendlySubtitle, reset } = messages.errorScreen;
			expect({ locale, title }).not.toEqual({ locale, title: en.errorScreen.title });
			expect({ locale, friendlySubtitle }).not.toEqual({
				locale,
				friendlySubtitle: en.errorScreen.friendlySubtitle
			});
			expect({ locale, reset }).not.toEqual({ locale, reset: en.errorScreen.reset });
		}
	});

	it('tells people what to do, not where the boilerplate keeps its files', () => {
		expect(en.errorScreen.friendlySubtitle).not.toMatch(/app\/|ErrorBoundary|customize/i);
	});
});
