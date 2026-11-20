import { AuthenticationStoreModel } from './authentication-store';

const create = (snapshot: Record<string, unknown>) => AuthenticationStoreModel.create(snapshot as never);

describe('the theme choice', () => {
	it('follows the phone for a person who never chose', () => {
		expect(create({ user: null }).followsSystemTheme).toBe(true);
	});

	it('keeps dark for a person who had dark before this version', () => {
		const store = create({ user: null, isDarkMode: true });
		expect(store.followsSystemTheme).toBe(false);
		expect(store.isDarkMode).toBe(true);
	});

	it('follows the phone for a person who had light before this version', () => {
		expect(create({ user: null, isDarkMode: false }).followsSystemTheme).toBe(true);
	});

	it("turns the shown theme into the person's own choice when they switch it", () => {
		const store = create({ user: null });

		store.toggleTheme(true);

		expect(store.followsSystemTheme).toBe(false);
		expect(store.isDarkMode).toBe(false);
	});

	it.each(['system', 'light', 'dark'] as const)('keeps %s once the person picks it', (preference) => {
		const store = create({ user: null, isDarkMode: true });

		store.setThemePreference(preference);

		expect(store.themePreference).toBe(preference);
	});

	it('follows the phone again, keeping the dark choice for later, when the person picks System', () => {
		const store = create({ user: null, isDarkMode: true });

		store.setThemePreference('system');

		expect(store.followsSystemTheme).toBe(true);
		expect(store.isDarkMode).toBe(true);
	});
});
