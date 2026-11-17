/**
 * The session moves out of the AsyncStorage snapshot `root-v1` into the secure storage, and people who update the
 * app stay signed in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { types } from 'mobx-state-tree';
import { AuthenticationStoreModel } from '../authentication-store';
import type { RootStore } from '../root-store';
import { setupRootStore } from './setup-root-store';

const mockSecureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
	setItemAsync: jest.fn(async (key: string, value: string) => {
		mockSecureValues.set(key, value);
	}),
	getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
	deleteItemAsync: jest.fn(async (key: string) => {
		mockSecureValues.delete(key);
	})
}));

const ROOT_KEY = 'root-v1';
const ACCESS_KEY = 'ever-teams.session.access-token';
const REFRESH_KEY = 'ever-teams.session.refresh-token';

async function savedSnapshot(): Promise<Record<string, any>> {
	const saved = await AsyncStorage.getItem(ROOT_KEY);
	return JSON.parse(saved ?? '{}');
}

async function settle() {
	for (let i = 0; i < 30; i++) {
		await Promise.resolve();
	}
}

const signedInBeforeThisVersion = {
	authenticationStore: {
		authToken: 'access-old',
		refreshToken: 'refresh-old',
		tenantId: 'tenant-1',
		isDarkMode: true
	}
};

/**
 * The root store with the one store this test is about: the full root store also brings stores with type errors of
 * their own on develop, which ts-jest would report here.
 */
const SessionRootModel = types.model('SessionRoot').props({
	authenticationStore: types.optional(AuthenticationStoreModel, () => AuthenticationStoreModel.create({ user: null }))
});
const createStore = () => SessionRootModel.create({}) as unknown as RootStore;

let unsubscribe: (() => void) | undefined;

beforeEach(async () => {
	mockSecureValues.clear();
	jest.clearAllMocks();
	await AsyncStorage.clear();
});

afterEach(() => {
	unsubscribe?.();
	unsubscribe = undefined;
});

describe('setupRootStore and the session', () => {
	it('moves the tokens of an earlier version to the secure storage and keeps the person signed in', async () => {
		await AsyncStorage.setItem(ROOT_KEY, JSON.stringify(signedInBeforeThisVersion));
		const store = createStore();

		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;

		expect(store.authenticationStore.isAuthenticated).toBe(true);
		expect(store.authenticationStore.isDarkMode).toBe(true);
		expect(mockSecureValues.get(ACCESS_KEY)).toBe('access-old');
		expect(mockSecureValues.get(REFRESH_KEY)).toBe('refresh-old');
		const saved = await savedSnapshot();
		expect(saved.authenticationStore.authToken).toBeUndefined();
		expect(saved.authenticationStore.refreshToken).toBeUndefined();
		expect(saved.authenticationStore.tenantId).toBe('tenant-1');
		expect(setup.sessionEnded).toBe(false);
	});

	it('keeps the tokens in root-v1 when the secure storage refuses them, to try again at the next launch', async () => {
		await AsyncStorage.setItem(ROOT_KEY, JSON.stringify(signedInBeforeThisVersion));
		jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore unavailable'));
		const store = createStore();

		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;
		store.authenticationStore.setAuthEmail('kofi.arden@example.com');
		await settle();

		expect(store.authenticationStore.isAuthenticated).toBe(true);
		const saved = await savedSnapshot();
		expect(saved.authenticationStore.authToken).toBe('access-old');
		expect(saved.authenticationStore.refreshToken).toBe('refresh-old');
	});

	it('reads the session from the secure storage when root-v1 holds none', async () => {
		await AsyncStorage.setItem(ROOT_KEY, JSON.stringify({ authenticationStore: { tenantId: 'tenant-1' } }));
		mockSecureValues.set(ACCESS_KEY, 'access-new');
		mockSecureValues.set(REFRESH_KEY, 'refresh-new');
		const store = createStore();

		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;

		expect(store.authenticationStore.authToken).toBe('access-new');
		expect(store.authenticationStore.refreshToken).toBe('refresh-new');
	});

	it('writes a new pair of tokens to the secure storage only, and forgets them on sign-out', async () => {
		const store = createStore();
		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;

		store.authenticationStore.setAuthToken('access-2');
		store.authenticationStore.setRefreshToken('refresh-2');
		await settle();

		expect(mockSecureValues.get(ACCESS_KEY)).toBe('access-2');
		expect(mockSecureValues.get(REFRESH_KEY)).toBe('refresh-2');
		const saved = await savedSnapshot();
		expect(saved.authenticationStore.authToken).toBeUndefined();
		expect(saved.authenticationStore.refreshToken).toBeUndefined();

		store.authenticationStore.logout();
		await settle();

		expect(mockSecureValues.size).toBe(0);
	});

	it('signs the person out and reports it when the secure storage cannot be read', async () => {
		await AsyncStorage.setItem(ROOT_KEY, JSON.stringify({ authenticationStore: { tenantId: 'tenant-1' } }));
		jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('could not decrypt'));
		const store = createStore();

		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;

		expect(setup.sessionEnded).toBe(true);
		expect(store.authenticationStore.isAuthenticated).toBe(false);
		expect(store.authenticationStore.tenantId).toBe('');
	});

	it('reports nothing on a first launch, when nobody was signed in', async () => {
		jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('could not decrypt'));
		const store = createStore();

		const setup = await setupRootStore(store);
		unsubscribe = setup.unsubscribe;

		expect(setup.sessionEnded).toBe(false);
	});
});
