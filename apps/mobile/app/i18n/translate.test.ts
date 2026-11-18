import fr from '../../locales/fr.json';
import { currentLocale, setAppLocale, subscribeToLocale, translate } from './translate';

jest.unmock('./translate');

describe('translate', () => {
	afterEach(() => {
		setAppLocale('en');
	});

	it('fills the placeholders of a message', () => {
		expect(translate('timer.startMove.startedAt', { time: '09:30' })).toBe('Started at 09:30');
	});

	it('follows the language set, whatever the region of its tag', () => {
		expect(setAppLocale('fr-FR')).toBe('fr');

		expect(currentLocale()).toBe('fr');
		expect(translate('common.cancel')).toBe(fr.common.cancel);
		expect(translate('timer.startMove.saved', { time: '09:30' })).toBe(
			fr.timer.startMove.saved.replace('{time}', '09:30')
		);
	});

	it('reads English for a language the app does not have', () => {
		expect(setAppLocale('sv-SE')).toBe('en');

		expect(translate('common.cancel')).toBe('Cancel');
	});

	it('tells its listeners when the language changes, and only then', () => {
		const listener = jest.fn();
		const stop = subscribeToLocale(listener);

		setAppLocale('de-DE');
		setAppLocale('de-AT');
		stop();
		setAppLocale('it');

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('shows a message the language misses in English, with its values', () => {
		try {
			jest.isolateModules(() => {
				jest.doMock('./messages', () => {
					const actual = jest.requireActual('./messages');
					const frenchMissingOne = JSON.parse(JSON.stringify(actual.messagesByLocale.fr));
					delete frenchMissingOne.timer.startMove.startedAt;
					return { ...actual, messagesByLocale: { ...actual.messagesByLocale, fr: frenchMissingOne } };
				});
				const isolated: typeof import('./translate') = jest.requireActual('./translate');

				isolated.setAppLocale('fr');

				expect(isolated.translate('timer.startMove.startedAt', { time: '09:30' })).toBe('Started at 09:30');
			});
		} finally {
			jest.dontMock('./messages');
		}
	});

	it('reads English before any language is set', () => {
		expect(setAppLocale(undefined)).toBe('en');
	});
});
