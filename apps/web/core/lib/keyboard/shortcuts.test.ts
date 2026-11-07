import {
	bindingKeyCaps,
	chordOfEvent,
	conflictsOf,
	effectiveBindings,
	formatBinding,
	isBrowserReserved,
	matchSequence,
	overlaps,
	parseBinding,
	SHORTCUT_COMMANDS,
	withOverride,
	type ShortcutChord
} from './shortcuts';

const press = (code: string, key: string, modifiers: Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>> = {}) =>
	chordOfEvent({ code, key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...modifiers }) as ShortcutChord;

describe('shortcut bindings', () => {
	it('parses and formats chords and sequences', () => {
		expect(formatBinding(parseBinding('Mod+Shift+D')!)).toBe('mod+shift+d');
		expect(formatBinding(parseBinding(' g  t ')!)).toBe('g t');
		expect(parseBinding('mod+')).toBeNull();
		expect(parseBinding('a+b')).toBeNull();
		expect(parseBinding('')).toBeNull();
	});

	it('shows key caps per platform', () => {
		expect(bindingKeyCaps(parseBinding('mod+s')!, true)).toEqual([['⌘', 'S']]);
		expect(bindingKeyCaps(parseBinding('mod+s')!, false)).toEqual([['Ctrl', 'S']]);
		expect(bindingKeyCaps(parseBinding('g t')!, true)).toEqual([['G'], ['T']]);
		expect(bindingKeyCaps(parseBinding('?')!, false)).toEqual([['?']]);
	});

	it('reads the physical key of a press, so J works on a non-Latin layout; punctuation is the character typed', () => {
		expect(press('KeyJ', 'о')).toEqual({ key: 'j', mod: false, shift: false, alt: false });
		expect(press('KeyS', 's', { ctrlKey: true })).toEqual({ key: 's', mod: true, shift: false, alt: false });
		// Shift+/ types `?` on a US layout: the chord is `?`, and it matches the help's default binding.
		const question = press('Slash', '?', { shiftKey: true });
		expect(question).toEqual({ key: '?', mod: false, shift: false, alt: false });
		expect(matchSequence([question], SHORTCUT_COMMANDS, effectiveBindings(SHORTCUT_COMMANDS, null), ['global']).command?.id).toBe('helpOpen');
		expect(chordOfEvent({ code: 'ShiftLeft', key: 'Shift', metaKey: false, ctrlKey: false, shiftKey: true, altKey: false })).toBeNull();
	});

	it('applies overrides over the defaults; fixed commands keep theirs', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { goTasks: 'g x', goDocs: '', listDown: 'n' });
		expect(formatBinding(bindings.get('goTasks')!)).toBe('g x');
		expect(bindings.get('goDocs')).toBeNull();
		expect(formatBinding(bindings.get('listDown')!)).toBe('j');
		expect(formatBinding(bindings.get('paletteOpen')!)).toBe('mod+k');
	});

	it('finds conflicts within a context and with the global ones, a prefix counting as one', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		expect(conflictsOf('goTasks', parseBinding('g m')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['goMine']);
		expect(conflictsOf('listSaveView', parseBinding('mod+k')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['paletteOpen']);
		expect(conflictsOf('listSaveView', parseBinding('s')!, SHORTCUT_COMMANDS, bindings)).toEqual([]);
		// `g` alone would fire before any `g …` sequence could: every one of them is a conflict.
		const prefixed = conflictsOf('goTasks', parseBinding('g')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id);
		expect(prefixed).toEqual(expect.arrayContaining(['goMine', 'goThisWeek', 'goOverdue', 'goViews', 'goDocs', 'goChat', 'goInbox']));
		expect(overlaps(parseBinding('g')!, parseBinding('g t')!)).toBe(true);
		expect(overlaps(parseBinding('g t')!, parseBinding('g')!)).toBe(true);
		expect(overlaps(parseBinding('g t')!, parseBinding('g m')!)).toBe(false);
		expect(isBrowserReserved(parseBinding('mod+w')!)).toBe(true);
		expect(isBrowserReserved(parseBinding('mod+s')!)).toBe(false);
	});

	it('keeps overrides minimal: a binding equal to the default is not stored', () => {
		expect(withOverride(null, 'goTasks', parseBinding('g t'), 'g t')).toEqual({});
		expect(withOverride({ goTasks: 'g x' }, 'goTasks', parseBinding('g t'), 'g t')).toEqual({});
		expect(withOverride(null, 'goTasks', parseBinding('g x'), 'g t')).toEqual({ goTasks: 'g x' });
		expect(withOverride(null, 'goTasks', null, 'g t')).toEqual({ goTasks: '' });
	});

	it('walks sequences: pending after the first chord, matched after the second', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		const g = press('KeyG', 'g');
		const t = press('KeyT', 't');
		expect(matchSequence([g], SHORTCUT_COMMANDS, bindings, ['global'])).toEqual({ command: null, pending: true });
		expect(matchSequence([g, t], SHORTCUT_COMMANDS, bindings, ['global']).command?.id).toBe('goTasks');
		expect(matchSequence([press('KeyZ', 'z')], SHORTCUT_COMMANDS, bindings, ['global'])).toEqual({ command: null, pending: false });
		// A list key does not fire outside the list.
		expect(matchSequence([press('KeyJ', 'j')], SHORTCUT_COMMANDS, bindings, ['global']).command).toBeNull();
		expect(matchSequence([press('KeyJ', 'j')], SHORTCUT_COMMANDS, bindings, ['global', 'list']).command?.id).toBe('listDown');
	});
});
