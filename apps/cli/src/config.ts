import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CliIo } from './io.js';
import { Refusal } from './refusals.js';

const FOLDER = 'ever-teams';
const FILE = 'config.json';

/** What login keeps: the API's address and the personal API token made for it. */
export interface StoredLogin {
	apiUrl: string;
	token: string;
}

type ConfigPlace = Pick<CliIo, 'env' | 'platform' | 'homedir'>;

/** %APPDATA%\ever-teams on Windows; $XDG_CONFIG_HOME/ever-teams, else ~/.config/ever-teams, elsewhere. */
export function configDirOf(place: ConfigPlace): string {
	if (place.platform === 'win32') {
		const appData = place.env.APPDATA || path.join(place.homedir, 'AppData', 'Roaming');
		return path.join(appData, FOLDER);
	}
	// The XDG specification asks to ignore a relative XDG_CONFIG_HOME.
	const xdgHome = place.env.XDG_CONFIG_HOME;
	if (xdgHome && path.isAbsolute(xdgHome)) {
		return path.join(xdgHome, FOLDER);
	}
	return path.join(place.homedir, '.config', FOLDER);
}

export const configFileOf = (place: ConfigPlace): string => path.join(configDirOf(place), FILE);

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException)?.code === 'ENOENT';

const damaged = (file: string) =>
	new Refusal('SETTINGS_DAMAGED', `The settings file ${file} cannot be read: run ever-teams login again.`);

function isLogin(value: unknown): value is StoredLogin {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const fields = value as { [key: string]: unknown };
	const hasApiUrl = typeof fields.apiUrl === 'string';
	const hasToken = typeof fields.token === 'string';
	return hasApiUrl && hasToken;
}

function loginOf(text: string, file: string): StoredLogin {
	let read: unknown;
	try {
		read = JSON.parse(text);
	} catch {
		throw damaged(file);
	}
	if (!isLogin(read)) {
		throw damaged(file);
	}
	return { apiUrl: read.apiUrl, token: read.token };
}

/** The stored login, or null before the first login and after logout. */
export function readLogin(place: ConfigPlace): StoredLogin | null {
	const file = configFileOf(place);
	let text: string;
	try {
		text = fs.readFileSync(file, 'utf8');
	} catch (error) {
		if (isMissing(error)) {
			return null;
		}
		throw damaged(file);
	}
	return loginOf(text, file);
}

/**
 * Stores the login in a file only its owner may read or write (0600). The file is written new, then moved over the
 * old one: a mode given to an existing file would not change it.
 */
export function writeLogin(place: ConfigPlace, login: StoredLogin): string {
	const dir = configDirOf(place);
	fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	const file = path.join(dir, FILE);
	const written = path.join(dir, `.${FILE}.${randomUUID()}`);
	try {
		fs.writeFileSync(written, `${JSON.stringify(login, null, '\t')}\n`, { flag: 'wx', mode: 0o600 });
		fs.renameSync(written, file);
	} catch (error) {
		fs.rmSync(written, { force: true });
		throw error;
	}
	return file;
}

/** Removes the stored login; false when there was none. */
export function removeLogin(place: ConfigPlace): boolean {
	try {
		fs.unlinkSync(configFileOf(place));
		return true;
	} catch (error) {
		if (isMissing(error)) {
			return false;
		}
		throw error;
	}
}
