import browser from '~misc/browser';

import type { Session } from '~lib/workspaces';

export const DEFAULT_API_URL = 'https://api.ever.team';
export const DEFAULT_APP_URL = 'https://app.ever.team';

/** Where the extension talks to: the API, and the web app it opens for the team page. */
export interface Settings {
	apiUrl: string;
	appUrl: string;
}

const KEYS = {
	session: 'session',
	settings: 'settings',
	recentTaskIds: 'recentTaskIds',
	selectedTaskId: 'selectedTaskId'
} as const;

async function read<T>(key: string): Promise<T | undefined> {
	const stored = await browser.storage.local.get(key);
	return stored[key] as T | undefined;
}

async function write(key: string, value: unknown): Promise<void> {
	await browser.storage.local.set({ [key]: value });
}

/** The signed-in person, or null: kept until they sign out. */
export async function loadSession(): Promise<Session | null> {
	return (await read<Session>(KEYS.session)) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
	await write(KEYS.session, session);
}

/** Signs out on this browser: the session and what was picked or started with it go, the settings stay. */
export async function clearSession(): Promise<void> {
	await browser.storage.local.remove([KEYS.session, KEYS.selectedTaskId, KEYS.recentTaskIds]);
}

export async function loadSettings(): Promise<Settings> {
	const stored = await read<Partial<Settings>>(KEYS.settings);
	return {
		apiUrl: stored?.apiUrl || DEFAULT_API_URL,
		appUrl: stored?.appUrl || DEFAULT_APP_URL
	};
}

export async function saveSettings(settings: Settings): Promise<void> {
	await write(KEYS.settings, settings);
}

export async function loadRecentTaskIds(): Promise<string[]> {
	return (await read<string[]>(KEYS.recentTaskIds)) ?? [];
}

export async function saveRecentTaskIds(ids: string[]): Promise<void> {
	await write(KEYS.recentTaskIds, ids);
}

export async function loadSelectedTaskId(): Promise<string | null> {
	return (await read<string>(KEYS.selectedTaskId)) ?? null;
}

export async function saveSelectedTaskId(taskId: string | null): Promise<void> {
	await write(KEYS.selectedTaskId, taskId);
}
