import { announceLayoutRestart, layOutFor } from './layout-direction';
import { applyProfileLanguage, startIn } from './start-language';
import { currentLocale, setAppLocale } from './translate';

jest.unmock('./translate');
jest.mock('./layout-direction', () => ({ layOutFor: jest.fn(), announceLayoutRestart: jest.fn() }));

function storageOf(entries: Record<string, string> = {}) {
	const values = new Map(Object.entries(entries));
	return {
		values,
		getItem: jest.fn(async (key: string) => values.get(key) ?? null),
		setItem: jest.fn(async (key: string, value: string) => {
			values.set(key, value);
		}),
		removeItem: jest.fn(async (key: string) => {
			values.delete(key);
		})
	};
}

beforeEach(() => {
	setAppLocale('en');
	jest.clearAllMocks();
});

describe('the language at start', () => {
	it('shows at once when the layout already has its direction', async () => {
		(layOutFor as jest.Mock).mockReturnValue(false);
		const reload = jest.fn(async () => undefined);

		await startIn('fr-FR', storageOf(), reload);

		expect(currentLocale()).toBe('fr');
		expect(reload).not.toHaveBeenCalled();
	});

	it('restarts before it shows, when its direction needs a restart', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		const storage = storageOf();
		const reload = jest.fn(async () => undefined);

		await startIn('ar', storage, reload);

		expect(reload).toHaveBeenCalledTimes(1);
		expect(currentLocale()).toBe('en');
		expect(storage.values.get('LayoutRestartedFor')).toBe('ar');
	});

	it('restarts once only, and shows, when the direction did not take', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		const reload = jest.fn(async () => undefined);

		await startIn('ar', storageOf({ LayoutRestartedFor: 'ar' }), reload);

		expect(reload).not.toHaveBeenCalled();
		expect(currentLocale()).toBe('ar');
	});

	it('shows when the marker of an earlier restart cannot be cleared', async () => {
		(layOutFor as jest.Mock).mockReturnValue(false);
		const storage = storageOf({ LayoutRestartedFor: 'ar' });
		storage.removeItem.mockRejectedValue(new Error('storage unavailable'));

		await startIn(
			'fr',
			storage,
			jest.fn(async () => undefined)
		);

		expect(currentLocale()).toBe('fr');
	});

	it('shows in the old direction, without a restart, when the marker cannot be read', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		const storage = storageOf();
		storage.getItem.mockRejectedValue(new Error('storage unavailable'));
		const reload = jest.fn(async () => undefined);

		await startIn('ar', storage, reload);

		expect(reload).not.toHaveBeenCalled();
		expect(currentLocale()).toBe('ar');
	});

	it('shows in the old direction when the restart fails', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		const reload = jest.fn(async () => {
			throw new Error('reload refused');
		});

		await startIn('ar', storageOf(), reload);

		expect(currentLocale()).toBe('ar');
	});
});

describe('the language of the profile', () => {
	it('is saved before the restart for its direction is offered', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		let finishSaving: () => void = () => undefined;
		const save = jest.fn(
			() =>
				new Promise<void>((resolve) => {
					finishSaving = resolve;
				})
		);

		const applying = applyProfileLanguage('ar', save);
		await Promise.resolve();
		expect(announceLayoutRestart).not.toHaveBeenCalled();

		finishSaving();
		await applying;
		expect(announceLayoutRestart).toHaveBeenCalledTimes(1);
		expect(currentLocale()).toBe('ar');
	});

	it('offers the restart once, however many screens apply it', async () => {
		(layOutFor as jest.Mock).mockReturnValue(true);
		const save = jest.fn(async () => undefined);

		await Promise.all([applyProfileLanguage('ar', save), applyProfileLanguage('ar', save)]);
		await applyProfileLanguage('ar', save);

		expect(announceLayoutRestart).toHaveBeenCalledTimes(1);
		expect(currentLocale()).toBe('ar');
	});

	it('shows unsaved for this session, without a restart that would start in the old language', async () => {
		const save = jest.fn(async () => {
			throw new Error('storage full');
		});

		await applyProfileLanguage('he', save);

		expect(currentLocale()).toBe('he');
		expect(layOutFor).not.toHaveBeenCalled();
		expect(announceLayoutRestart).not.toHaveBeenCalled();
	});
});
