import { I18nManager } from 'react-native';
import { isLaidOutRightToLeft, isRightToLeft, layOutFor } from './layout-direction';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));

// one store for every MMKV instance, as on the phone, where an id names one file
const mockStore = new Map<string, string>();
jest.mock('react-native-mmkv', () => ({
	MMKV: jest.fn().mockImplementation(() => ({
		getString: (key: string) => mockStore.get(key),
		set: (key: string, value: string) => {
			mockStore.set(key, value);
		}
	}))
}));

function processStartedIn(rightToLeft: boolean) {
	Object.defineProperty(I18nManager, 'isRTL', { configurable: true, get: () => rightToLeft });
}

describe('the layout direction', () => {
	let forceRTL: jest.SpyInstance;
	let allowRTL: jest.SpyInstance;

	beforeEach(() => {
		mockStore.clear();
		forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
		allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('is right to left for Arabic and Hebrew only', () => {
		expect(isRightToLeft('ar')).toBe(true);
		expect(isRightToLeft('he')).toBe(true);
		expect(isRightToLeft('en')).toBe(false);
		expect(isRightToLeft('zh')).toBe(false);
	});

	it('turns right to left for Arabic on a left to right layout, and asks for a restart', () => {
		processStartedIn(false);

		expect(layOutFor('ar')).toBe(true);
		expect(allowRTL).toHaveBeenCalledWith(true);
		expect(forceRTL).toHaveBeenCalledWith(true);
	});

	it('turns left to right for English on a right to left layout, as on an Arabic phone', () => {
		processStartedIn(true);

		expect(layOutFor('en')).toBe(true);
		expect(forceRTL).toHaveBeenCalledWith(false);
	});

	it('asks for no restart when the layout already has the direction', () => {
		processStartedIn(true);

		expect(layOutFor('he')).toBe(false);
		expect(forceRTL).not.toHaveBeenCalled();
	});

	it('asks for one restart only, though the process still reports the direction it started with', () => {
		processStartedIn(false);
		layOutFor('ar');

		expect(layOutFor('ar')).toBe(false);
		expect(isLaidOutRightToLeft()).toBe(true);
	});
});
