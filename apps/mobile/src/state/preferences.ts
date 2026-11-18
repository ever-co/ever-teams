import { MMKV } from 'react-native-mmkv';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { ThemePreference } from '../theme';

const preferencesStorage = new MMKV({ id: 'ever-teams.preferences' });

const storage = createJSONStorage<ThemePreference>(() => ({
	getItem: (key: string) => preferencesStorage.getString(key) ?? null,
	setItem: (key: string, value: string) => preferencesStorage.set(key, value),
	removeItem: (key: string) => preferencesStorage.delete(key)
}));

/** Light, dark, or the phone's setting; read when the app starts, so the first frame already has the right theme. */
export const themePreferenceAtom = atomWithStorage<ThemePreference>('theme', 'system', storage, { getOnInit: true });
