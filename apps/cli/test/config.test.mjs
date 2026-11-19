// Where the login is kept, and how: against the built command line, node --test test/*.test.mjs (from apps/cli,
// after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { configDirOf, configFileOf, readLogin, removeLogin, writeLogin } from '../dist/config.js';
import { newHome, placeOf } from './support/cli.mjs';

const LOGIN = { apiUrl: 'http://127.0.0.1:3000/api', token: 'gzp_example_token_for_tests' };

const isWindows = process.platform === 'win32';

test('the settings folder is %APPDATA% on Windows, else XDG_CONFIG_HOME or ~/.config', () => {
	const windows = {
		platform: 'win32',
		homedir: 'C:\\Users\\ada',
		env: { APPDATA: 'C:\\Users\\ada\\AppData\\Roaming' }
	};
	const linux = { platform: 'linux', homedir: '/home/ada', env: { XDG_CONFIG_HOME: '/home/ada/.settings' } };

	assert.equal(configDirOf(windows), path.join('C:\\Users\\ada\\AppData\\Roaming', 'ever-teams'));
	assert.equal(configDirOf({ ...windows, env: {} }), path.join('C:\\Users\\ada', 'AppData', 'Roaming', 'ever-teams'));
	assert.equal(configDirOf(linux), path.join('/home/ada/.settings', 'ever-teams'));
	assert.equal(configDirOf({ ...linux, env: {} }), path.join('/home/ada', '.config', 'ever-teams'));
	assert.equal(
		configDirOf({ ...linux, platform: 'darwin', env: {} }),
		path.join('/home/ada', '.config', 'ever-teams')
	);
	// A relative XDG_CONFIG_HOME is ignored, as the XDG specification asks.
	assert.equal(
		configDirOf({ ...linux, env: { XDG_CONFIG_HOME: 'settings' } }),
		path.join('/home/ada', '.config', 'ever-teams')
	);
});

test('a login is written, read back and removed', () => {
	const place = placeOf(newHome());

	assert.equal(readLogin(place), null);
	const file = writeLogin(place, LOGIN);

	assert.equal(file, configFileOf(place));
	assert.deepEqual(readLogin(place), LOGIN);
	assert.equal(removeLogin(place), true);
	assert.equal(removeLogin(place), false);
	assert.equal(readLogin(place), null);
	assert.deepEqual(fs.readdirSync(configDirOf(place)), []);
});

test('the login file may be read and written by its owner only', { skip: isWindows && 'POSIX modes only' }, () => {
	const place = placeOf(newHome());
	fs.mkdirSync(configDirOf(place), { recursive: true });
	// A file left readable by others before is replaced, not reused with its mode.
	fs.writeFileSync(configFileOf(place), '{}', { mode: 0o644 });

	writeLogin(place, LOGIN);

	assert.equal(fs.statSync(configFileOf(place)).mode & 0o777, 0o600);
	assert.deepEqual(readLogin(place), LOGIN);
});

test('a settings file that is not a login is refused with what to do', () => {
	const place = placeOf(newHome());
	fs.mkdirSync(configDirOf(place), { recursive: true });

	for (const text of ['not json', '{"apiUrl": "http://127.0.0.1:3000/api"}', 'null']) {
		fs.writeFileSync(configFileOf(place), text);
		assert.throws(
			() => readLogin(place),
			(error) => {
				assert.equal(error.code, 'SETTINGS_DAMAGED');
				assert.match(error.message, /run ever-teams login again\.$/);
				return true;
			}
		);
	}
});
