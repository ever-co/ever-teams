import fr from '../../locales/fr.json';
import { currentLocale, setAppLocale, translate } from './translate';

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
		expect(setAppLocale('pt-BR')).toBe('en');

		expect(translate('common.cancel')).toBe('Cancel');
	});

	it('reads English before any language is set', () => {
		expect(setAppLocale(undefined)).toBe('en');
	});
});
