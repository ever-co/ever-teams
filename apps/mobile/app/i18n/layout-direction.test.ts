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

type Layout = typeof import('./layout-direction');
type ReactNative = typeof import('react-native');

let layout: Layout;
let forceRTL: jest.SpyInstance;
let allowRTL: jest.SpyInstance;

/** A new start of the app: the process reports its own direction, and the module reads the running one again. */
function startWith(processRightToLeft: boolean, requestedBefore?: 'rtl' | 'ltr') {
	jest.resetModules();
	mockStore.clear();
	if (requestedBefore) {
		mockStore.set('requested-direction', requestedBefore);
	}
	const { I18nManager }: ReactNative = jest.requireActual('react-native');
	Object.defineProperty(I18nManager, 'isRTL', { configurable: true, get: () => processRightToLeft });
	forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
	allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
	layout = jest.requireActual('./layout-direction');
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe('the layout direction', () => {
	it('is right to left for Arabic and Hebrew only', () => {
		startWith(false);

		expect(layout.isRightToLeft('ar')).toBe(true);
		expect(layout.isRightToLeft('he')).toBe(true);
		expect(layout.isRightToLeft('en')).toBe(false);
		expect(layout.isRightToLeft('zh')).toBe(false);
	});

	it('turns right to left for Arabic on a left to right layout, and asks for a restart', () => {
		startWith(false);

		expect(layout.layOutFor('ar')).toBe(true);
		expect(allowRTL).toHaveBeenCalledWith(true);
		expect(forceRTL).toHaveBeenCalledWith(true);
	});

	it('turns left to right for English on a right to left layout, as on an Arabic phone', () => {
		startWith(true);

		expect(layout.layOutFor('en')).toBe(true);
		expect(forceRTL).toHaveBeenLastCalledWith(false);
	});

	it('asks for no restart when the layout already has the direction', () => {
		startWith(true);

		expect(layout.layOutFor('he')).toBe(false);
	});

	it('asks for no restart after the one that applied it, though the process reports its first direction', () => {
		startWith(false, 'rtl');

		expect(layout.layOutFor('ar')).toBe(false);
		expect(layout.isLaidOutRightToLeft()).toBe(true);
	});

	it('cancels a restart left for later when the language comes back to the running direction', () => {
		startWith(false);
		layout.layOutFor('ar');

		expect(layout.layOutFor('en')).toBe(false);
		expect(forceRTL).toHaveBeenLastCalledWith(false);
	});

	it('still asks for the restart left for later when another right to left language follows', () => {
		startWith(false);
		layout.layOutFor('ar');

		expect(layout.layOutFor('he')).toBe(true);
	});
});
