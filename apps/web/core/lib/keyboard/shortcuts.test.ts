import {
	bindingKeyCaps,
	bindingSearchWords,
	chordOfEvent,
	commandOfTypedSequence,
	conflictsOf,
	effectiveBindings,
	formatBinding,
	isBrowserReserved,
	matchListKey,
	matchSequence,
	overlaps,
	parseBinding,
	refusalOf,
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
		// The key `+` is written `plus`: formatting and parsing round-trip.
		expect(parseBinding('shift+plus')).toEqual([{ key: '+', mod: false, shift: true, alt: false }]);
		expect(formatBinding([{ key: '+', mod: false, shift: true, alt: false }])).toBe('shift+plus');
		expect(formatBinding(parseBinding('mod+plus')!)).toBe('mod+plus');
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

	it('reads a digit key that types punctuation with Shift as that character, and the digit otherwise', () => {
		// `/` is Shift+7 on a German layout, `!` Shift+1 on a US one.
		expect(press('Digit7', '/', { shiftKey: true })).toEqual({ key: '/', mod: false, shift: false, alt: false });
		expect(press('Digit1', '!', { shiftKey: true })).toEqual({ key: '!', mod: false, shift: false, alt: false });
		// A French layout types `&` on that key without Shift, and the digit with it: the physical key both times.
		expect(press('Digit1', '&')).toEqual({ key: '1', mod: false, shift: false, alt: false });
		expect(press('Digit1', '1', { shiftKey: true })).toEqual({ key: '1', mod: false, shift: true, alt: false });
	});

	it('applies overrides over the defaults; fixed commands keep theirs', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { goTasks: 'g x', goDocs: '', listDown: 'b', listOpen: 'space', taskCreate: 'q' });
		expect(formatBinding(bindings.get('goTasks')!)).toBe('g x');
		expect(bindings.get('goDocs')).toBeNull();
		// The list's letters can be rebound; its built-in keys (Enter, Esc) and `C` are not.
		expect(formatBinding(bindings.get('listDown')!)).toBe('b');
		expect(formatBinding(bindings.get('listOpen')!)).toBe('enter');
		expect(formatBinding(bindings.get('taskCreate')!)).toBe('c');
		expect(formatBinding(bindings.get('paletteOpen')!)).toBe('mod+k');
	});

	it('keeps the default of a command whose stored binding the help would refuse', () => {
		// Stored by another client or by hand: a sequence, ⌘/Ctrl, or a key the list keeps for itself.
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, {
			taskStatus: 'g s',
			listUp: 'o',
			listSelect: 'shift+arrowdown',
			taskPriority: 'mod+b',
			taskLabels: ''
		});
		expect(formatBinding(bindings.get('taskStatus')!)).toBe('s');
		expect(formatBinding(bindings.get('listUp')!)).toBe('k');
		expect(formatBinding(bindings.get('listSelect')!)).toBe('x');
		expect(formatBinding(bindings.get('taskPriority')!)).toBe('p');
		// An empty override still removes the key.
		expect(bindings.get('taskLabels')).toBeNull();
		// Commands the registry's listener runs take sequences; a key the list keeps or a browser combination is refused
		// for them too (a "go to" on Esc would run as the focused row clears its selection).
		const registry = effectiveBindings(SHORTCUT_COMMANDS, {
			listSaveView: 'g e',
			goTasks: 'escape',
			helpOpen: 'mod+w',
			// A browser chord anywhere in a sequence: it could never be finished.
			goMine: 'mod+w m',
			goViews: 'g mod+t'
		});
		expect(formatBinding(registry.get('listSaveView')!)).toBe('g e');
		expect(formatBinding(registry.get('goTasks')!)).toBe('g t');
		expect(formatBinding(registry.get('helpOpen')!)).toBe('?');
		expect(formatBinding(registry.get('goMine')!)).toBe('g m');
		expect(formatBinding(registry.get('goViews')!)).toBe('g v');
	});

	it('settles stored bindings that clash: in registry order, the first override in conflict goes back to its default', () => {
		const resolved = (overrides: Record<string, string>) => {
			const bindings = effectiveBindings(SHORTCUT_COMMANDS, overrides);
			return Object.fromEntries(Object.keys(overrides).map((id) => [id, formatBinding(bindings.get(id) ?? [])]));
		};
		// `B` for the next row would take the first key of `B T`: the "go to" (earlier in the registry) goes back.
		expect(resolved({ listDown: 'b', goTasks: 'b t' })).toEqual({ listDown: 'b', goTasks: 'g t' });
		// Two commands on one key: the earlier goes back, the later keeps it.
		expect(resolved({ listDown: 'u', listUp: 'u' })).toEqual({ listDown: 'j', listUp: 'u' });
		// An override on a default still in force goes back: Status on Shift+X would take the range selection.
		expect(resolved({ taskStatus: 'shift+x' })).toEqual({ taskStatus: 's' });
		// A default left in force by a refused override counts too: Previous on J while Next cannot leave J.
		expect(resolved({ listDown: 'mod+b', listUp: 'j' })).toEqual({ listDown: 'j', listUp: 'k' });
		// Settled until none clashes: `g w` sends Tasks back to `g t`, which then sends Mine (on `g t`) back too.
		expect(resolved({ goMine: 'g t', goTasks: 'g w' })).toEqual({ goMine: 'g m', goTasks: 'g t' });
		// A swap clashes with nothing and stays.
		expect(resolved({ listDown: 'k', listUp: 'j' })).toEqual({ listDown: 'k', listUp: 'j' });
		expect(resolved({ goTasks: 'g m', goMine: 'g t' })).toEqual({ goTasks: 'g m', goMine: 'g t' });
		// And whatever is stored, the bindings in force never clash.
		const messy = effectiveBindings(SHORTCUT_COMMANDS, { listDown: 'g', goTasks: 'x', taskStatus: 'k', listUp: 's', goDocs: 'd' });
		for (const command of SHORTCUT_COMMANDS) {
			const binding = messy.get(command.id);
			if (binding) expect(conflictsOf(command.id, binding, SHORTCUT_COMMANDS, messy)).toEqual([]);
		}
	});

	it('refuses a sequence or ⌘/Ctrl for a row key, a key the list keeps, and a browser combination', () => {
		const command = (id: string) => SHORTCUT_COMMANDS.find((item) => item.id === id)!;
		for (const id of ['listDown', 'listUp', 'listSelect', 'taskStatus', 'taskPriority', 'taskLabels', 'taskDueDate']) {
			expect(command(id).fixed).toBeFalsy();
			expect(refusalOf(command(id), parseBinding('g j')!)).toBe('sequence');
			// ⌘/Ctrl chords belong to the browser and the app's other listeners (the sidebar's Mod+B).
			expect(refusalOf(command(id), parseBinding('mod+b')!)).toBe('modifier');
			expect(refusalOf(command(id), parseBinding('mod+shift+j')!)).toBe('modifier');
			expect(refusalOf(command(id), parseBinding('n')!)).toBeNull();
			expect(refusalOf(command(id), parseBinding('alt+n')!)).toBeNull();
			expect(refusalOf(command(id), parseBinding('shift+n')!)).toBeNull();
		}
		// The registry's own commands walk sequences and take ⌘/Ctrl.
		expect(refusalOf(command('listSaveView'), parseBinding('g s')!)).toBeNull();
		expect(refusalOf(command('listSaveView'), parseBinding('mod+shift+s')!)).toBeNull();
		expect(refusalOf(command('goTasks'), parseBinding('g x')!)).toBeNull();
		// ↑ ↓ Enter O Esc, with Shift or not, stay the list's (as the first key; `g o` is fine).
		expect(refusalOf(command('listDown'), parseBinding('o')!)).toBe('listKey');
		expect(refusalOf(command('taskStatus'), parseBinding('shift+arrowdown')!)).toBe('listKey');
		expect(refusalOf(command('goTasks'), parseBinding('enter')!)).toBe('listKey');
		expect(refusalOf(command('goTasks'), parseBinding('escape g')!)).toBe('listKey');
		expect(refusalOf(command('goOverdue'), parseBinding('g o')!)).toBeNull();
		expect(refusalOf(command('goTasks'), parseBinding('alt+o')!)).toBeNull();
		expect(refusalOf(command('listDown'), parseBinding('mod+w')!)).toBe('reserved');
	});

	it('matches a row key: the built-in keys, then the exact chord, then without Shift (extend)', () => {
		const defaults = effectiveBindings(SHORTCUT_COMMANDS, null);
		const match = (chord: ShortcutChord, bindings = defaults) => matchListKey(chord, SHORTCUT_COMMANDS, bindings);
		expect(match(press('KeyJ', 'j'))).toEqual({ commandId: 'listDown', extend: false });
		expect(match(press('KeyJ', 'J', { shiftKey: true }))).toEqual({ commandId: 'listDown', extend: true });
		expect(match(press('KeyK', 'k'))).toEqual({ commandId: 'listUp', extend: false });
		expect(match(press('KeyX', 'X', { shiftKey: true }))).toEqual({ commandId: 'listSelect', extend: true });
		expect(match(press('KeyS', 's'))?.commandId).toBe('taskStatus');
		expect(match(press('KeyS', 'S', { shiftKey: true }))?.commandId).toBe('taskStatus');
		expect(match(press('KeyP', 'p'))?.commandId).toBe('taskPriority');
		expect(match(press('KeyL', 'l'))?.commandId).toBe('taskLabels');
		expect(match(press('KeyD', 'd'))?.commandId).toBe('taskDueDate');
		// Built in: the arrows (Shift extends), Enter and O, Esc.
		expect(match(press('ArrowDown', 'ArrowDown'))).toEqual({ commandId: 'listDown', extend: false });
		expect(match(press('ArrowUp', 'ArrowUp', { shiftKey: true }))).toEqual({ commandId: 'listUp', extend: true });
		expect(match(press('Enter', 'Enter'))?.commandId).toBe('listOpen');
		expect(match(press('KeyO', 'o'))?.commandId).toBe('listOpen');
		expect(match(press('Escape', 'Escape'))?.commandId).toBe('listClear');
		// Not row keys: ⌘/Ctrl or Alt with a letter bound bare, a letter nobody holds.
		expect(match(press('KeyJ', 'j', { ctrlKey: true }))).toBeNull();
		expect(match(press('KeyO', 'o', { altKey: true }))).toBeNull();
		expect(match(press('KeyG', 'g'))).toBeNull();

		// Rebound: the new keys work, the old ones no longer do, the built-in ones stay.
		const rebound = effectiveBindings(SHORTCUT_COMMANDS, { listDown: 'b', taskStatus: 'alt+s' });
		expect(match(press('KeyB', 'b'), rebound)).toEqual({ commandId: 'listDown', extend: false });
		expect(match(press('KeyB', 'B', { shiftKey: true }), rebound)).toEqual({ commandId: 'listDown', extend: true });
		expect(match(press('KeyJ', 'j'), rebound)).toBeNull();
		expect(match(press('ArrowDown', 'ArrowDown'), rebound)?.commandId).toBe('listDown');
		expect(match(press('KeyS', 's', { altKey: true }), rebound)?.commandId).toBe('taskStatus');
		expect(match(press('KeyS', 's'), rebound)).toBeNull();
		// The exact chord comes before the one without Shift (a map the help could not produce: J and Shift+J both held).
		const both = new Map(defaults).set('taskDueDate', parseBinding('shift+j'));
		expect(match(press('KeyJ', 'J', { shiftKey: true }), both)).toEqual({ commandId: 'taskDueDate', extend: false });
		expect(match(press('KeyJ', 'j'), both)).toEqual({ commandId: 'listDown', extend: false });
		// A physical key: `B` on a non-Latin layout.
		expect(match(press('KeyB', 'и'), rebound)?.commandId).toBe('listDown');
	});

	it('reads the character typed instead of the physical key when asked (the list with the registry off)', () => {
		const dvorakJ = { code: 'KeyC', key: 'j', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
		expect(chordOfEvent(dvorakJ)?.key).toBe('c');
		expect(chordOfEvent(dvorakJ, false)?.key).toBe('j');
		expect(chordOfEvent({ ...dvorakJ, key: 'J', shiftKey: true }, false)).toEqual({ key: 'j', mod: false, shift: true, alt: false });
		expect(chordOfEvent({ ...dvorakJ, code: 'Enter', key: 'Enter' }, false)?.key).toBe('enter');
	});

	it('finds conflicts within a context and with the global ones, a prefix counting as one', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		expect(conflictsOf('goTasks', parseBinding('g m')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['goMine']);
		expect(conflictsOf('listSaveView', parseBinding('mod+k')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['paletteOpen']);
		// A focused task is a row of the list: `s` on the list would be the task's status picker.
		expect(conflictsOf('listSaveView', parseBinding('s')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id)).toEqual(['taskStatus']);
		expect(conflictsOf('listSaveView', parseBinding('mod+shift+s')!, SHORTCUT_COMMANDS, bindings)).toEqual([]);
		// `g` alone would fire before any `g …` sequence could: every one of them is a conflict.
		const prefixed = conflictsOf('goTasks', parseBinding('g')!, SHORTCUT_COMMANDS, bindings).map((command) => command.id);
		expect(prefixed).toEqual(expect.arrayContaining(['goMine', 'goThisWeek', 'goOverdue', 'goViews', 'goDocs', 'goChat', 'goInbox']));
		expect(overlaps(parseBinding('g')!, parseBinding('g t')!)).toBe(true);
		expect(overlaps(parseBinding('g t')!, parseBinding('g')!)).toBe(true);
		expect(overlaps(parseBinding('g t')!, parseBinding('g m')!)).toBe(false);
		expect(isBrowserReserved(parseBinding('mod+w')!)).toBe(true);
		expect(isBrowserReserved(parseBinding('mod+s')!)).toBe(false);
		// A sequence with a browser chord anywhere could never be finished.
		expect(isBrowserReserved(parseBinding('mod+w t')!)).toBe(true);
		expect(isBrowserReserved(parseBinding('g mod+t')!)).toBe(true);
		expect(isBrowserReserved(parseBinding('g t')!)).toBe(false);
		expect(refusalOf(SHORTCUT_COMMANDS.find((item) => item.id === 'goTasks')!, parseBinding('mod+w t')!)).toBe('reserved');
	});

	it('finds conflicts between row keys, Shift on a row key counting as that key', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		const conflicts = (id: string, text: string) => conflictsOf(id, parseBinding(text)!, SHORTCUT_COMMANDS, bindings).map((command) => command.id);
		expect(conflicts('listDown', 'k')).toEqual(['listUp']);
		expect(conflicts('listDown', 's')).toEqual(['taskStatus']);
		expect(conflicts('taskStatus', 'c')).toEqual(['taskCreate']);
		expect(conflicts('listDown', 'b')).toEqual([]);
		// `N` starts the "create" sequences (`N T`, `N P`, `N U`): taken.
		expect(conflicts('listDown', 'n')).toEqual(['teamCreate', 'projectCreate', 'inviteUser']);
		// Shift+J extends the selection down: it is the next row's key too.
		expect(conflicts('taskStatus', 'shift+j')).toEqual(['listDown']);
		expect(conflicts('goTasks', 'shift+x')).toEqual(['listSelect']);
		// And the other way round: B for the next row would take Shift+B from whoever holds it.
		const withShiftB = effectiveBindings(SHORTCUT_COMMANDS, { taskDueDate: 'shift+b' });
		expect(conflictsOf('listDown', parseBinding('b')!, SHORTCUT_COMMANDS, withShiftB).map((command) => command.id)).toEqual(['taskDueDate']);
		// A picker's key with Shift opens the picker too, so Shift+S is the status key's as well.
		expect(conflicts('listUp', 'shift+s')).toEqual(['taskStatus']);
		// Status rebound to B: a "go to" on Shift+B would never run on a focused row, the list taking it first.
		const statusOnB = effectiveBindings(SHORTCUT_COMMANDS, { taskStatus: 'b' });
		expect(conflictsOf('goTasks', parseBinding('shift+b')!, SHORTCUT_COMMANDS, statusOnB).map((command) => command.id)).toEqual(['taskStatus']);
		// Alt and Shift together: Shift+Alt+S is the status key's when it is Alt+S.
		const statusOnAltS = effectiveBindings(SHORTCUT_COMMANDS, { taskStatus: 'alt+s' });
		expect(conflictsOf('listUp', parseBinding('shift+alt+s')!, SHORTCUT_COMMANDS, statusOnAltS).map((command) => command.id)).toEqual(['taskStatus']);
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

describe('the default bindings', () => {
	const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);

	it('never clash and are never refused: the palette commands left C and the row letters alone', () => {
		for (const command of SHORTCUT_COMMANDS) {
			const binding = bindings.get(command.id);
			expect(binding).toBeTruthy();
			// The list's built-in keys (Enter, Esc) are fixed: no one records them, so no refusal applies.
			if (!command.fixed) {
				expect({ id: command.id, refusal: refusalOf(command, binding!) }).toEqual({ id: command.id, refusal: null });
			}
			const clashes = conflictsOf(command.id, binding!, SHORTCUT_COMMANDS, bindings).map((other) => other.id);
			expect({ id: command.id, clashes }).toEqual({ id: command.id, clashes: [] });
		}
	});

	it('give the palette commands their new keys', () => {
		const text = (id: string) => formatBinding(bindings.get(id)!);
		expect(text('themeToggle')).toBe('t h');
		expect(text('teamCreate')).toBe('n t');
		expect(text('projectCreate')).toBe('n p');
		expect(text('inviteUser')).toBe('n u');
		expect(text('searchTasks')).toBe('/ t');
		expect(text('goKanban')).toBe('g k');
		expect(text('goProfile')).toBe('g u');
		// The old ones started with `C` (create a task at once) or a row letter (`S` opens the status picker).
		for (const old of ['c t', 'c p', 's t', 'a m']) {
			expect(SHORTCUT_COMMANDS.some((command) => command.defaultBinding === old)).toBe(false);
		}
	});

	it('runs `G K` through the sequence walker, the list leaving its K to the registry meanwhile', () => {
		const g = press('KeyG', 'g');
		const k = press('KeyK', 'k');
		expect(matchSequence([g, k], SHORTCUT_COMMANDS, bindings, ['global', 'list', 'task']).command?.id).toBe('goKanban');
		// `/` is the character typed, whatever key prints it.
		const slash = press('Digit7', '/', { shiftKey: true });
		expect(matchSequence([slash, press('KeyP', 'p')], SHORTCUT_COMMANDS, bindings, ['global']).command?.id).toBe('searchProjects');
	});
});

describe('a sequence typed into the palette', () => {
	const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);

	it('names the command of the binding in force, in any case, the keys separated by spaces', () => {
		expect(commandOfTypedSequence('g t', SHORTCUT_COMMANDS, bindings)?.id).toBe('goTasks');
		expect(commandOfTypedSequence('  G   O ', SHORTCUT_COMMANDS, bindings)?.id).toBe('goOverdue');
		expect(commandOfTypedSequence('/ t', SHORTCUT_COMMANDS, bindings)?.id).toBe('searchTasks');
	});

	it('is a search otherwise: one word, a longer word, a sequence nobody has', () => {
		expect(commandOfTypedSequence('gt', SHORTCUT_COMMANDS, bindings)).toBeNull();
		expect(commandOfTypedSequence('g', SHORTCUT_COMMANDS, bindings)).toBeNull();
		expect(commandOfTypedSequence('go to', SHORTCUT_COMMANDS, bindings)).toBeNull();
		expect(commandOfTypedSequence('g z', SHORTCUT_COMMANDS, bindings)).toBeNull();
		expect(commandOfTypedSequence('', SHORTCUT_COMMANDS, bindings)).toBeNull();
	});

	it('follows a rebinding, and only among the commands given (the ones someone can run)', () => {
		const rebound = effectiveBindings(SHORTCUT_COMMANDS, { goKanban: 'b k' });
		expect(commandOfTypedSequence('b k', SHORTCUT_COMMANDS, rebound)?.id).toBe('goKanban');
		expect(commandOfTypedSequence('g k', SHORTCUT_COMMANDS, rebound)).toBeNull();
		const onlyTasks = SHORTCUT_COMMANDS.filter((command) => command.id === 'goTasks');
		expect(commandOfTypedSequence('g o', onlyTasks, bindings)).toBeNull();
	});

	it('finds an entry by its binding written with or without the spaces', () => {
		expect(bindingSearchWords(parseBinding('g t'))).toEqual(['g t', 'gt']);
		expect(bindingSearchWords(parseBinding('mod+,'))).toEqual(['mod+,']);
		expect(bindingSearchWords(null)).toEqual([]);
	});
});
