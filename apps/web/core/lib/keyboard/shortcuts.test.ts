import {
	bindingKeyCaps,
	chordOfEvent,
	conflictsOf,
	effectiveBindings,
	formatBinding,
	isBrowserReserved,
	matchSequence,
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
		expect(bindingKeyCaps(parseBinding('shift+/')!, false)).toEqual([['Shift', '/']]);
	});

	it('reads the physical key of a press, so J works on a non-Latin layout', () => {
		expect(press('KeyJ', 'о')).toEqual({ key: 'j', mod: false, shift: false, alt: false });
		expect(press('KeyS', 's', { ctrlKey: true })).toEqual({ key: 's', mod: true, shift: false, alt: false });
		expect(press('Slash', '?', { shiftKey: true })).toEqual({ key: '?', mod: false, shift: true, alt: false });
		expect(chordOfEvent({ code: 'ShiftLeft', key: 'Shift', metaKey: false, ctrlKey: false, shiftKey: true, altKey: false })).toBeNull();
	});

	it('applies overrides over the defaults; fixed commands keep theirs', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { 'go.tasks': 'g x', 'go.docs': '', 'list.down': 'n' });
		expect(formatBinding(bindings.get('go.tasks')!)).toBe('g x');
		expect(bindings.get('go.docs')).toBeNull();
		expect(formatBinding(bindings.get('list.down')!)).toBe('j');
		expect(formatBinding(bindings.get('palette.open')!)).toBe('mod+k');
	});

	it('finds conflicts within a context and with the global ones', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		expect(conflictsOf('go.tasks', parseBinding('g m')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['go.mine']);
		expect(conflictsOf('list.saveView', parseBinding('mod+k')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['palette.open']);
		expect(conflictsOf('list.saveView', parseBinding('s')!, SHORTCUT_COMMANDS, bindings)).toEqual([]);
		expect(isBrowserReserved(parseBinding('mod+w')!)).toBe(true);
		expect(isBrowserReserved(parseBinding('mod+s')!)).toBe(false);
	});

	it('keeps overrides minimal: a binding equal to the default is not stored', () => {
		expect(withOverride(null, 'go.tasks', parseBinding('g t'), 'g t')).toEqual({});
		expect(withOverride({ 'go.tasks': 'g x' }, 'go.tasks', parseBinding('g t'), 'g t')).toEqual({});
		expect(withOverride(null, 'go.tasks', parseBinding('g x'), 'g t')).toEqual({ 'go.tasks': 'g x' });
		expect(withOverride(null, 'go.tasks', null, 'g t')).toEqual({ 'go.tasks': '' });
	});

	it('walks sequences: pending after the first chord, matched after the second', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		const g = press('KeyG', 'g');
		const t = press('KeyT', 't');
		expect(matchSequence([g], SHORTCUT_COMMANDS, bindings, ['global'])).toEqual({ command: null, pending: true });
		expect(matchSequence([g, t], SHORTCUT_COMMANDS, bindings, ['global']).command?.id).toBe('go.tasks');
		expect(matchSequence([press('KeyZ', 'z')], SHORTCUT_COMMANDS, bindings, ['global'])).toEqual({ command: null, pending: false });
		// A list key does not fire outside the list.
		expect(matchSequence([press('KeyJ', 'j')], SHORTCUT_COMMANDS, bindings, ['global']).command).toBeNull();
		expect(matchSequence([press('KeyJ', 'j')], SHORTCUT_COMMANDS, bindings, ['global', 'list']).command?.id).toBe('list.down');
	});
});
