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
	/** A command the person cannot rebind in this version (the list's own keys). */
	fixed?: boolean;
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
	// the list (its keys are the list's own in this version)
	{ id: 'listDown', context: 'list', defaultBinding: 'j', fixed: true },
	{ id: 'listUp', context: 'list', defaultBinding: 'k', fixed: true },
	{ id: 'listOpen', context: 'list', defaultBinding: 'enter', fixed: true },
	{ id: 'listSelect', context: 'list', defaultBinding: 'x', fixed: true },
	{ id: 'listClear', context: 'list', defaultBinding: 'escape', fixed: true },
	{ id: 'listSaveView', context: 'list', defaultBinding: 'mod+s' },
	// a focused task
	{ id: 'taskStatus', context: 'task', defaultBinding: 's', fixed: true },
	{ id: 'taskPriority', context: 'task', defaultBinding: 'p', fixed: true },
	{ id: 'taskLabels', context: 'task', defaultBinding: 'l', fixed: true },
	{ id: 'taskDueDate', context: 'task', defaultBinding: 'd', fixed: true }
];

/** The contexts in the order the help dialog lists them. */
export const SHORTCUT_CONTEXTS: readonly ShortcutContext[] = ['global', 'list', 'task', 'view'];

const MODIFIER_NAMES = new Set(['mod', 'ctrl', 'cmd', 'meta', 'shift', 'alt', 'option', 'control', 'os']);

/** Key combinations the browser keeps for itself: a binding on one of them is refused. */
const BROWSER_RESERVED = new Set(['mod+w', 'mod+t', 'mod+n', 'mod+q', 'mod+r', 'mod+l', 'mod+shift+t', 'mod+shift+n', 'mod+shift+w', 'f5', 'f11', 'f12']);

/** The single chords ⌘/Ctrl combinations of which the registry owns while it is on; the older listeners leave them alone. */
export const REGISTRY_OWNED_MOD_KEYS: ReadonlySet<string> = new Set(['k', 's', ',']);

/** The commands that still run while a dialog is open: toggles that leave the dialog's form as it is. */
export const DIALOG_SAFE_COMMANDS: ReadonlySet<string> = new Set(['paletteOpen', 'helpOpen']);

/** The contexts whose keys reach the same person at once: a focused task is a row of the list. */
const OVERLAPPING_CONTEXTS: ReadonlySet<ShortcutContext> = new Set(['list', 'task']);

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

/** The key of a key press as a binding names it: letters and digits by their physical key, the rest by `key`. */
export function chordKeyOf(event: Pick<KeyboardEvent, 'key' | 'code'>): string {
	const code = event.code ?? '';
	if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
	if (/^Digit\d$/.test(code)) return code.slice(5);
	const key = (event.key ?? '').toLowerCase();
	if (key === ' ') return 'space';
	return key;
}

/** The chord a key press is, or null for a modifier alone. Punctuation carries its own Shift (`?` is one key). */
export function chordOfEvent(event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): ShortcutChord | null {
	const key = chordKeyOf(event);
	if (!key || MODIFIER_NAMES.has(key)) return null;
	const shift = isPrintablePunctuation(key) ? false : !!event.shiftKey;
	return { key, mod: !!(event.metaKey || event.ctrlKey), shift, alt: !!event.altKey };
}

/** Whether two chords are the same keys. */
export function sameChord(first: ShortcutChord, second: ShortcutChord): boolean {
	return first.key === second.key && first.mod === second.mod && first.shift === second.shift && first.alt === second.alt;
}

/** Whether a binding is one the browser keeps (`mod+w`, `mod+t`, …). */
export function isBrowserReserved(binding: ShortcutBinding): boolean {
	return binding.length === 1 && BROWSER_RESERVED.has(formatBinding(binding));
}

/** The bindings in force: the defaults with the person's overrides on top (an empty override removes the default). */
export function effectiveBindings(commands: readonly ShortcutCommand[], overrides: Record<string, string> | null | undefined): Map<string, ShortcutBinding | null> {
	const result = new Map<string, ShortcutBinding | null>();
	for (const command of commands) {
		const override = overrides?.[command.id];
		if (command.fixed || override === undefined) {
			result.set(command.id, parseBinding(command.defaultBinding));
			continue;
		}
		result.set(command.id, override === '' ? null : (parseBinding(override) ?? parseBinding(command.defaultBinding)));
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

/**
 * The commands whose binding would clash with the given one in the same (or the global) context, the list and a
 * focused task counting as one — the same keys, or one binding the start of the other — the command itself left out.
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
		return sharesContext && overlaps(binding, otherBinding);
	});
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
