// The kit's words read as people write them (ever-co/ever-teams#5620): node --test test/*.test.mjs (from
// packages/toolkit/atoms). Reads the two locales the kit ships.
// The misspellings the test looks for, and the French words it expects:
// cspell:ignore Muniteur Demarrer Arreter Selectionner Weeky reversable
// cspell:words Démarrer Arrêter Tâche
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const locales = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'i18n', 'locales');
const read = (name) => JSON.parse(fs.readFileSync(path.join(locales, `${name}.json`), 'utf8'));

// Every string of a locale, at any depth.
function stringsOf(messages) {
	return Object.values(messages).flatMap((value) => {
		if (typeof value === 'string') {
			return [value];
		}
		return stringsOf(value);
	});
}

test('the French words carry their accents, and the timer is a "Minuteur"', () => {
	const fr = read('fr');

	assert.equal(fr.TIME_TRACKER.title, 'Minuteur');
	assert.equal(fr.TIME_TRACKER.start, 'Démarrer');
	assert.equal(fr.TIME_TRACKER.stop, 'Arrêter');
	assert.equal(fr.COMMON.task, 'Tâche');
	assert.equal(fr.COMMON.team, 'Équipe');
	const unaccented = /\b(Muniteur|Demarrer|Arreter|Selectionner|Tache|tache|Equipe|periode)\b/;
	assert.deepEqual(
		stringsOf(fr).filter((text) => unaccented.test(text)),
		[]
	);
});

test('the English words have no typo', () => {
	const en = read('en');

	assert.equal(en.REPORT.week_activity, 'Weekly activity');
	assert.deepEqual(
		stringsOf(en).filter((text) => /\b(Weeky|reversable)\b/i.test(text)),
		[]
	);
});
