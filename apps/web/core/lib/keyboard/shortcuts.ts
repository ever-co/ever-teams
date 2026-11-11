/**
 * The app's shortcut registry: every command with its context, its default binding and the key names the help
 * dialog shows. Pure: no React, no DOM. Bindings use one syntax everywhere — keys separated by `+` for a chord
 * (`mod+s`, `shift+d`), chords separated by a space for a sequence (`g t`). `mod` is ⌘ on a Mac and Ctrl elsewhere.
 * Letters match the physical key (`event.code`), so `J` works on a layout where that key prints something else;
 * punctuation is the character typed (`?`, not `shift+/`), since the key that prints it differs by layout.
 *
 * Command ids are plain words (no dots): they are also the i18n keys under `shortcuts.commands` and the keys of
 * the person's overrides on the platform.
 */

/** Where a command applies; a key press is matched against the contexts active at the time. */
export type ShortcutContext = 'global' | 'list' | 'task' | 'view';

export interface ShortcutCommand {
	id: string;
	context: ShortcutContext;
	/** The binding when the person has not changed it. */
	defaultBinding: string;
	/** A command the person cannot rebind (the list's built-in keys, `C`). */
	fixed?: boolean;
	/**
	 * A key the list matches itself on a focused row (`J`, `S`, …): one chord without ⌘/Ctrl, never a sequence. The
	 * list takes the chord with Shift added too (a binding without Shift): the row-moving commands extend the
	 * selection with it, the pickers open as without it.
	 */
	chordOnly?: boolean;
}

export interface ShortcutChord {
	key: string;
	mod: boolean;
	shift: boolean;
	alt: boolean;
}

/** A parsed binding: one chord, or a sequence of chords. */
export type ShortcutBinding = ShortcutChord[];

export const SHORTCUT_COMMANDS: readonly ShortcutCommand[] = [
	// global
	{ id: 'paletteOpen', context: 'global', defaultBinding: 'mod+k' },
	{ id: 'helpOpen', context: 'global', defaultBinding: '?' },
	{ id: 'taskCreate', context: 'global', defaultBinding: 'c', fixed: true },
	{ id: 'settingsOpen', context: 'global', defaultBinding: 'mod+,' },
	{ id: 'goTasks', context: 'global', defaultBinding: 'g t' },
	{ id: 'goMine', context: 'global', defaultBinding: 'g m' },
	{ id: 'goThisWeek', context: 'global', defaultBinding: 'g w' },
	{ id: 'goOverdue', context: 'global', defaultBinding: 'g o' },
	{ id: 'goViews', context: 'global', defaultBinding: 'g v' },
	{ id: 'goDocs', context: 'global', defaultBinding: 'g d' },
	{ id: 'goChat', context: 'global', defaultBinding: 'g c' },
	{ id: 'goInbox', context: 'global', defaultBinding: 'g i' },
	// the command palette's own commands (their old keys clashed with `C` and the row letters: see plan.md)
	{ id: 'goHome', context: 'global', defaultBinding: 'g h' },
	{ id: 'goProjects', context: 'global', defaultBinding: 'g p' },
	{ id: 'goKanban', context: 'global', defaultBinding: 'g k' },
	{ id: 'goProfile', context: 'global', defaultBinding: 'g u' },
	{ id: 'goTimesheets', context: 'global', defaultBinding: 'g s' },
	{ id: 'goWeeklyLimit', context: 'global', defaultBinding: 'g l' },
	{ id: 'goTimeActivity', context: 'global', defaultBinding: 'g a' },
	{ id: 'teamCreate', context: 'global', defaultBinding: 'n t' },
	{ id: 'projectCreate', context: 'global', defaultBinding: 'n p' },
	{ id: 'inviteUser', context: 'global', defaultBinding: 'n u' },
	{ id: 'searchTasks', context: 'global', defaultBinding: '/ t' },
	{ id: 'searchProjects', context: 'global', defaultBinding: '/ p' },
	{ id: 'searchTeams', context: 'global', defaultBinding: '/ m' },
	{ id: 'themeToggle', context: 'global', defaultBinding: 't h' },
	// the list (the arrows, Enter, O and Esc stay its own; the person can rebind the letters)
	{ id: 'listDown', context: 'list', defaultBinding: 'j', chordOnly: true },
	{ id: 'listUp', context: 'list', defaultBinding: 'k', chordOnly: true },
	{ id: 'listOpen', context: 'list', defaultBinding: 'enter', fixed: true },
	{ id: 'listSelect', context: 'list', defaultBinding: 'x', chordOnly: true },
	{ id: 'listClear', context: 'list', defaultBinding: 'escape', fixed: true },
	{ id: 'listSaveView', context: 'list', defaultBinding: 'mod+s' },
	// a focused task
	{ id: 'taskStatus', context: 'task', defaultBinding: 's', chordOnly: true },
	{ id: 'taskPriority', context: 'task', defaultBinding: 'p', chordOnly: true },
	{ id: 'taskLabels', context: 'task', defaultBinding: 'l', chordOnly: true },
	{ id: 'taskDueDate', context: 'task', defaultBinding: 'd', chordOnly: true }
];

/** The contexts in the order the help dialog lists them. */
export const SHORTCUT_CONTEXTS: readonly ShortcutContext[] = ['global', 'list', 'task', 'view'];

const MODIFIER_NAMES = new Set(['mod', 'ctrl', 'cmd', 'meta', 'shift', 'alt', 'option', 'control', 'os']);

/** Key combinations the browser keeps for itself: a binding on one of them is refused. */
const BROWSER_RESERVED = new Set(['mod+w', 'mod+t', 'mod+n', 'mod+q', 'mod+r', 'mod+l', 'mod+shift+t', 'mod+shift+n', 'mod+shift+w', 'f5', 'f11', 'f12']);

/** The commands that still run while a dialog is open: toggles that leave the dialog's form as it is. */
export const DIALOG_SAFE_COMMANDS: ReadonlySet<string> = new Set(['paletteOpen', 'helpOpen']);

/** The contexts whose keys reach the same person at once: a focused task is a row of the list. */
const OVERLAPPING_CONTEXTS: ReadonlySet<ShortcutContext> = new Set(['list', 'task']);

/**
 * The keys the list keeps on a focused row whatever the bindings, by the command they run: the arrows walk the rows
 * (with Shift, extending the selection), Enter and O open the task, Esc clears the selection.
 */
const LIST_BUILT_IN_KEYS: ReadonlyMap<string, string> = new Map([
	['arrowdown', 'listDown'],
	['arrowup', 'listUp'],
	['enter', 'listOpen'],
	['o', 'listOpen'],
	['escape', 'listClear']
]);

/** The key `+` is written `plus` in a binding, since `+` separates the keys of a chord. */
const PLUS_KEY_NAME = 'plus';

/** One chord of a binding (`mod+shift+d`), or null when it is not one. */
export function parseChord(text: string): ShortcutChord | null {
	const parts = text.trim().toLowerCase().split('+').filter(Boolean);
	if (!parts.length) return null;
	const chord: ShortcutChord = { key: '', mod: false, shift: false, alt: false };
	for (const part of parts) {
		if (part === 'mod' || part === 'ctrl' || part === 'cmd' || part === 'meta') chord.mod = true;
		else if (part === 'shift') chord.shift = true;
		else if (part === 'alt' || part === 'option') chord.alt = true;
		else if (chord.key) return null;
		else chord.key = part === PLUS_KEY_NAME ? '+' : part;
	}
	return chord.key ? chord : null;
}

/** A binding (`g t`, `mod+s`), or null when any chord is malformed. */
export function parseBinding(text: string): ShortcutBinding | null {
	const chords = text.trim().split(/\s+/).filter(Boolean).map(parseChord);
	if (!chords.length || chords.includes(null)) return null;
	return chords as ShortcutChord[];
}

/** The canonical text of a binding (`mod+shift+d`, `g t`): what is stored and compared. */
export function formatBinding(binding: ShortcutBinding): string {
	return binding
		.map((chord) =>
			[chord.mod ? 'mod' : '', chord.shift ? 'shift' : '', chord.alt ? 'alt' : '', chord.key === '+' ? PLUS_KEY_NAME : chord.key]
				.filter(Boolean)
				.join('+')
		)
		.join(' ');
}

const KEY_LABELS: Record<string, string> = {
	enter: 'Enter',
	escape: 'Esc',
	backspace: '⌫',
	arrowup: '↑',
	arrowdown: '↓',
	arrowleft: '←',
	arrowright: '→',
	space: 'Space'
};

/** The key caps of a binding as the help shows them: one list per chord (`['⌘', 'S']`), chords in order. */
export function bindingKeyCaps(binding: ShortcutBinding, isMac: boolean): string[][] {
	return binding.map((chord) => {
		const caps: string[] = [];
		if (chord.mod) caps.push(isMac ? '⌘' : 'Ctrl');
		if (chord.alt) caps.push(isMac ? '⌥' : 'Alt');
		if (chord.shift) caps.push(isMac ? '⇧' : 'Shift');
		caps.push(KEY_LABELS[chord.key] ?? chord.key.toUpperCase());
		return caps;
	});
}

/** Whether a key name is a character typed with (or without) Shift, whose own identity carries the Shift. */
function isPrintablePunctuation(key: string): boolean {
	return key.length === 1 && !/[a-z\d]/.test(key);
}

/**
 * The key of a key press as a binding names it: letters and digits by their physical key, the rest by `key`. A digit
 * key pressed with Shift that types punctuation is that character (`/` is Shift+7 on a German layout), as punctuation
 * always is. With `byPhysicalKey` false, letters and digits are the character typed too (the list's keys with the
 * registry off).
 */
export function chordKeyOf(
	event: Pick<KeyboardEvent, 'key' | 'code'> & { shiftKey?: boolean },
	byPhysicalKey = true
): string {
	const code = byPhysicalKey ? (event.code ?? '') : '';
	if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
	const typed = event.key ?? '';
	if (/^Digit\d$/.test(code)) return event.shiftKey && isPrintablePunctuation(typed) ? typed : code.slice(5);
	const key = typed.toLowerCase();
	if (key === ' ') return 'space';
	return key;
}

/** The chord a key press is, or null for a modifier alone. Punctuation carries its own Shift (`?` is one key). */
export function chordOfEvent(
	event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
	byPhysicalKey = true
): ShortcutChord | null {
	const key = chordKeyOf(event, byPhysicalKey);
	if (!key || MODIFIER_NAMES.has(key)) return null;
	const shift = isPrintablePunctuation(key) ? false : !!event.shiftKey;
	return { key, mod: !!(event.metaKey || event.ctrlKey), shift, alt: !!event.altKey };
}

/** Whether two chords are the same keys. */
export function sameChord(first: ShortcutChord, second: ShortcutChord): boolean {
	return first.key === second.key && first.mod === second.mod && first.shift === second.shift && first.alt === second.alt;
}

/** Whether a binding has a chord the browser keeps (`mod+w`, or `mod+w t`: the sequence could never be finished). */
export function isBrowserReserved(binding: ShortcutBinding): boolean {
	return binding.some((chord) => BROWSER_RESERVED.has(formatBinding([chord])));
}

/** Whether a chord is one of the keys the list keeps on a focused row (↑, ↓, Enter, O, Esc; Shift or not). */
function isListBuiltInKey(chord: ShortcutChord): boolean {
	return !chord.mod && !chord.alt && LIST_BUILT_IN_KEYS.has(chord.key);
}

/**
 * Why a binding cannot be given to a command, or null when it can: one the browser keeps (`reserved`); for a key the
 * list matches itself, a sequence (`sequence`) or ⌘/Ctrl (`modifier`: the browser's and the app's other listeners
 * own those chords — copy, select all, the sidebar's `Mod+B` — and would run as well); or one starting with a key the
 * list keeps for itself (`listKey`), which would never reach the command while a row has the focus.
 */
export function refusalOf(
	command: ShortcutCommand,
	binding: ShortcutBinding
): 'reserved' | 'sequence' | 'modifier' | 'listKey' | null {
	if (isBrowserReserved(binding)) return 'reserved';
	if (command.chordOnly && binding.length > 1) return 'sequence';
	if (command.chordOnly && binding.some((chord) => chord.mod)) return 'modifier';
	if (binding.length > 0 && isListBuiltInKey(binding[0])) return 'listKey';
	return null;
}

/**
 * The bindings in force: the defaults with the person's overrides on top (an empty override removes the default).
 * Overrides the help would not have saved — stored by another client or by hand — leave the default in force: one it
 * refuses (a browser combination, a key the list keeps, a sequence or ⌘/Ctrl for a row key: a "go to" on Esc would
 * run as the focused row clears its selection), and one that clashes with another binding in force (`n` for the next
 * row and `n t` for a "go to": `N` would move the row before the sequence could start). Clashes are settled in
 * registry order: the first override found in conflict goes back to its default, then the check runs again, until
 * none clashes; a swap (J and K exchanged) clashes with nothing and stays.
 */
export function effectiveBindings(commands: readonly ShortcutCommand[], overrides: Record<string, string> | null | undefined): Map<string, ShortcutBinding | null> {
	const result = new Map<string, ShortcutBinding | null>();
	const overridden: ShortcutCommand[] = [];
	for (const command of commands) {
		const override = overrides?.[command.id];
		const defaultBinding = parseBinding(command.defaultBinding);
		if (command.fixed || override === undefined) {
			result.set(command.id, defaultBinding);
			continue;
		}
		if (override === '') {
			result.set(command.id, null);
			continue;
		}
		const parsed = parseBinding(override);
		if (!parsed || refusalOf(command, parsed) !== null) {
			result.set(command.id, defaultBinding);
			continue;
		}
		result.set(command.id, parsed);
		overridden.push(command);
	}
	const reverted = new Set<string>();
	let isSettled = false;
	while (!isSettled) {
		isSettled = true;
		for (const command of overridden) {
			if (reverted.has(command.id)) continue;
			if (!conflictsOf(command.id, result.get(command.id) as ShortcutBinding, commands, result).length) continue;
			result.set(command.id, parseBinding(command.defaultBinding));
			reverted.add(command.id);
			isSettled = false;
			break;
		}
	}
	return result;
}

/** Whether one binding starts with the other (equal bindings included): the shorter would fire before the longer could. */
export function overlaps(first: ShortcutBinding, second: ShortcutBinding): boolean {
	const length = Math.min(first.length, second.length);
	for (let at = 0; at < length; at += 1) {
		if (!sameChord(first[at], second[at])) return false;
	}
	return true;
}

/** The bindings a command holds: its own, and for a row key without Shift, the same chord with Shift (the list takes it). */
function heldBindingsOf(command: ShortcutCommand, binding: ShortcutBinding): ShortcutBinding[] {
	const [chord] = binding;
	if (!command.chordOnly || binding.length !== 1 || chord.shift) return [binding];
	return [binding, [{ ...chord, shift: true }]];
}

/**
 * The commands whose binding would clash with the given one in the same (or the global) context, the list and a
 * focused task counting as one — the same keys, or one binding the start of the other, `Shift+J` counting as a row
 * key bound to `J` — the command itself left out.
 */
export function conflictsOf(
	commandId: string,
	binding: ShortcutBinding,
	commands: readonly ShortcutCommand[],
	bindings: ReadonlyMap<string, ShortcutBinding | null>
): ShortcutCommand[] {
	const command = commands.find((item) => item.id === commandId);
	if (!command) return [];
	return commands.filter((other) => {
		if (other.id === commandId) return false;
		const otherBinding = bindings.get(other.id);
		if (!otherBinding) return false;
		const sharesContext =
			other.context === command.context ||
			other.context === 'global' ||
			command.context === 'global' ||
			(OVERLAPPING_CONTEXTS.has(other.context) && OVERLAPPING_CONTEXTS.has(command.context));
		if (!sharesContext) return false;
		const theirs = heldBindingsOf(other, otherBinding);
		return heldBindingsOf(command, binding).some((mine) => theirs.some((held) => overlaps(mine, held)));
	});
}

/**
 * The list command a key press on a focused row runs, or null: the built-in keys first (↑/↓, Enter/O, Esc), then the
 * bindings in force of the one-chord commands — the exact chord, then the chord without Shift, which extends
 * (`Shift+J` adds the next row to the selection, `Shift+X` selects a range; a picker opens as without it). `extend` is
 * whether Shift was pressed beyond the binding. `conflictsOf` counts that Shift chord as the command's.
 */
export function matchListKey(
	chord: ShortcutChord,
	commands: readonly ShortcutCommand[],
	bindings: ReadonlyMap<string, ShortcutBinding | null>
): { commandId: string; extend: boolean } | null {
	const builtIn = isListBuiltInKey(chord) ? LIST_BUILT_IN_KEYS.get(chord.key) : undefined;
	if (builtIn) return { commandId: builtIn, extend: chord.shift };
	const boundTo = (pressed: ShortcutChord) =>
		commands.find((command) => {
			if (!command.chordOnly) return false;
			const binding = bindings.get(command.id);
			return binding?.length === 1 && sameChord(binding[0], pressed);
		});
	const exact = boundTo(chord);
	if (exact) return { commandId: exact.id, extend: false };
	if (!chord.shift) return null;
	const plain = boundTo({ ...chord, shift: false });
	return plain ? { commandId: plain.id, extend: true } : null;
}

/** The overrides with one command's binding changed (`null` restores the default). */
export function withOverride(overrides: Record<string, string> | null | undefined, commandId: string, binding: ShortcutBinding | null, defaultBinding: string): Record<string, string> {
	const next: Record<string, string> = { ...overrides };
	if (binding === null) {
		next[commandId] = '';
		return next;
	}
	const text = formatBinding(binding);
	if (text === formatBinding(parseBinding(defaultBinding) ?? [])) delete next[commandId];
	else next[commandId] = text;
	return next;
}

/**
 * Walks a sequence: given the chords pressed so far and the bindings in force for the active contexts, answers the
 * command that matched, or whether more chords could still match (so the caller keeps the pending chords).
 */
export function matchSequence(
	pressed: ShortcutChord[],
	commands: readonly ShortcutCommand[],
	bindings: ReadonlyMap<string, ShortcutBinding | null>,
	activeContexts: readonly ShortcutContext[]
): { command: ShortcutCommand | null; pending: boolean } {
	let pending = false;
	for (const command of commands) {
		if (!activeContexts.includes(command.context)) continue;
		const binding = bindings.get(command.id);
		if (!binding) continue;
		if (binding.length < pressed.length) continue;
		const prefixMatches = pressed.every((chord, at) => sameChord(chord, binding[at]));
		if (!prefixMatches) continue;
		if (binding.length === pressed.length) return { command, pending: false };
		pending = true;
	}
	return { command: null, pending };
}

/**
 * The command a sequence typed as text in the command palette names (`g t`, `G T`: one key per word), among the
 * given commands with their bindings in force, or null. A sequence only, and only bare keys: one word is a search,
 * and ⌘/Ctrl or Shift cannot be typed into a field.
 */
export function commandOfTypedSequence(
	text: string,
	commands: readonly ShortcutCommand[],
	bindings: ReadonlyMap<string, ShortcutBinding | null>
): ShortcutCommand | null {
	const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length < 2 || words.some((word) => Array.from(word).length !== 1)) return null;
	const typed: ShortcutBinding = words.map((key) => ({ key, mod: false, shift: false, alt: false }));
	const found = commands.find((command) => {
		const binding = bindings.get(command.id);
		return binding?.length === typed.length && binding.every((chord, at) => sameChord(chord, typed[at]));
	});
	return found ?? null;
}

/**
 * The words a palette entry is also found by: its binding as text, with and without the spaces (`g t`, `gt`), so
 * typing the keys of a sequence lists the command it runs.
 */
export function bindingSearchWords(binding: ShortcutBinding | null | undefined): string[] {
	if (!binding?.length) return [];
	const text = formatBinding(binding);
	const joined = text.replace(/\s+/g, '');
	return joined === text ? [text] : [text, joined];
}

/** Whether a modal dialog is open on the page: its form has the keys then, not the app's commands. */
export function isDialogOpen(doc: Pick<Document, 'querySelectorAll'> | undefined): boolean {
	if (!doc) return false;
	for (const element of Array.from(doc.querySelectorAll('[role="dialog"], [aria-modal="true"]'))) {
		const dialog = element as HTMLElement;
		if (dialog.hidden || dialog.getAttribute('aria-hidden') === 'true') continue;
		if (dialog.getClientRects().length > 0) return true;
	}
	return false;
}

/** Whether the key press happened in a field where letters are typed, not commands. */
export function isTypingTarget(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	if (!element || typeof element.tagName !== 'string') return false;
	const tag = element.tagName.toUpperCase();
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable === true;
}
