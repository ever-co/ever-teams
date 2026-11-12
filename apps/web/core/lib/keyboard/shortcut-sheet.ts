import {
	bindingKeyCaps,
	effectiveBindings,
	parseBinding,
	type ShortcutBinding,
	type ShortcutCommand
} from './shortcuts';

/**
 * The lines of the shortcuts sheet: every key the app answers for this person, by group. Each line is read from the
 * place its key is declared (the shortcut registry, the legacy hotkeys, a component's own key), so a key and its line
 * cannot drift apart, and a key nobody answers right now is not a line. Pure: no React, no DOM.
 */

export type ShortcutSheetGroup = 'general' | 'timer' | 'tasks' | 'navigation' | 'chat';

/** The groups in the order the sheet lists them. */
export const SHORTCUT_SHEET_GROUPS: readonly ShortcutSheetGroup[] = ['general', 'timer', 'tasks', 'navigation', 'chat'];

/** One way to press a shortcut: its chords in order, each as its key caps (`[['G'], ['T']]`, `[['⌘', 'K']]`). */
export type ShortcutKeys = string[][];

export interface ShortcutSheetLine {
	id: string;
	group: ShortcutSheetGroup;
	/** The i18n key of what the keys do. */
	labelKey: string;
	/** Every way to press it; none when the person removed the binding of a registry command. */
	keys: ShortcutKeys[];
	/** The registry command behind the line, which the person may rebind. */
	command?: ShortcutCommand;
}

export interface ShortcutSheetSection {
	group: ShortcutSheetGroup;
	lines: ShortcutSheetLine[];
}

/** A legacy hotkey, as `use-hotkeys.ts` declares it. */
export interface HotkeyLine {
	/** Its name: a key of the `hotkeys` messages. */
	label: string;
	/** The hotkeys-js declaration that presses it (`shift+h,h`). */
	keys: string;
	/** The declaration its listener binds, when one listener answers several lines (the timer's). */
	boundAs?: string;
	/** The registry command that does the same: the hotkey is then one more way to press that command's line. */
	command?: string;
}

export interface HotkeyGroup {
	group: ShortcutSheetGroup;
	keySequence: readonly HotkeyLine[];
}

/** A key a component answers by itself (the sidebar's toggle), written as a registry binding (`mod+b`). */
export interface OwnKeyLine {
	id: string;
	group: ShortcutSheetGroup;
	labelKey: string;
	binding: string;
}

export interface ShortcutSheetFacts {
	isMac: boolean;
	/** Whether the registry's listener is mounted (the saved-views feature). */
	registryOn: boolean;
	/** The registry's commands this deployment has. */
	commands: readonly ShortcutCommand[];
	/** The bindings in force: the defaults with the person's own on top. */
	bindings: ReadonlyMap<string, ShortcutBinding | null>;
	/** The commands a handler is registered for right now. */
	registered: { has(commandId: string): boolean };
	/** Whether a focused row answers the key of a task command: some pickers only exist with the registry. */
	answersRowKey: (commandId: string) => boolean;
	hotkeys: readonly HotkeyGroup[];
	/** The hotkeys-js declarations bound right now: a hotkey lives only while its component is on the page. */
	boundHotkeys: { has(declaration: string): boolean };
	ownKeys: readonly OwnKeyLine[];
}

/**
 * The global commands the app answers while the registry is off: the palette's own ⌘/Ctrl+K listener, and the help
 * key of the shortcuts mount. The others are the registry listener's only.
 */
const ANSWERED_WITHOUT_REGISTRY: ReadonlySet<string> = new Set(['paletteOpen', 'helpOpen']);

/** The global commands that read better with another group than "general". */
const GLOBAL_COMMAND_GROUPS: Readonly<Record<string, ShortcutSheetGroup>> = {
	taskCreate: 'tasks',
	settingsOpen: 'navigation'
};

/** The registry names its commands that lead to a page `go…`. */
const GO_TO_COMMAND_ID = /^go[A-Z]/;

/** The modifiers of a hotkeys-js declaration. Its `ctrl` is the Control key on a Mac too, never ⌘. */
const HOTKEY_MODIFIER_CAPS: Readonly<Record<string, { mac: string; other: string }>> = {
	ctrl: { mac: '⌃', other: 'Ctrl' },
	control: { mac: '⌃', other: 'Ctrl' },
	alt: { mac: '⌥', other: 'Alt' },
	option: { mac: '⌥', other: 'Alt' },
	shift: { mac: '⇧', other: 'Shift' },
	cmd: { mac: '⌘', other: 'Win' },
	command: { mac: '⌘', other: 'Win' }
};

function modifierCapOf(name: string, isMac: boolean): string | undefined {
	const caps = HOTKEY_MODIFIER_CAPS[name];
	if (!caps) {
		return undefined;
	}
	if (isMac) {
		return caps.mac;
	}
	return caps.other;
}

function keyCapOf(key: string, isMac: boolean): string {
	const [caps] = bindingKeyCaps([{ key, mod: false, shift: false, alt: false }], isMac);
	return caps[0];
}

function hotkeyChordCaps(chord: string, isMac: boolean): string[] {
	const parts = chord.trim().toLowerCase().split('+');
	const caps: string[] = [];
	for (const part of parts) {
		const modifierCap = modifierCapOf(part, isMac);
		if (modifierCap) {
			caps.push(modifierCap);
			continue;
		}
		caps.push(keyCapOf(part, isMac));
	}
	return caps;
}

function chordSignatureOf(caps: readonly string[]): string {
	return caps.join('+');
}

function signatureOf(keys: ShortcutKeys): string {
	const chords = keys.map(chordSignatureOf);
	return chords.join(' ');
}

/** Whether a chord is another chord of its declaration with Shift added: the same key, held with Shift. */
function isShiftDouble(caps: readonly string[], shiftCap: string | undefined, pressed: ReadonlySet<string>): boolean {
	const withoutShift = caps.filter((cap) => cap !== shiftCap);
	const hasShift = withoutShift.length < caps.length;
	if (!hasShift) {
		return false;
	}
	return pressed.has(chordSignatureOf(withoutShift));
}

/**
 * The ways to press a hotkeys-js declaration, as key caps. Two spellings of one chord (`ctrl+option+]` and
 * `ctrl+alt+]`) are one way; a chord that only adds Shift to another one of the declaration (`shift+h` beside `h`)
 * is not a way of its own.
 */
export function hotkeyKeys(declaration: string, isMac: boolean): ShortcutKeys[] {
	const chords = declaration.split(',').filter((chord) => chord.trim().length > 0);
	const capsOfChords = chords.map((chord) => hotkeyChordCaps(chord, isMac));
	const pressed = new Set(capsOfChords.map(chordSignatureOf));
	const shiftCap = modifierCapOf('shift', isMac);
	const ways: ShortcutKeys[] = [];
	const listed = new Set<string>();
	for (const caps of capsOfChords) {
		const signature = chordSignatureOf(caps);
		if (listed.has(signature)) {
			continue;
		}
		if (isShiftDouble(caps, shiftCap, pressed)) {
			continue;
		}
		listed.add(signature);
		ways.push([caps]);
	}
	return ways;
}

function groupOfCommand(command: ShortcutCommand): ShortcutSheetGroup {
	if (command.context === 'chat') {
		return 'chat';
	}
	if (command.context !== 'global') {
		return 'tasks';
	}
	const ownGroup = GLOBAL_COMMAND_GROUPS[command.id];
	if (ownGroup) {
		return ownGroup;
	}
	if (GO_TO_COMMAND_ID.test(command.id)) {
		return 'navigation';
	}
	return 'general';
}

/** Whether a key press of the command reaches someone right now. */
function isAnswered(command: ShortcutCommand, facts: ShortcutSheetFacts): boolean {
	if (command.context === 'global') {
		if (facts.registryOn) {
			return facts.registered.has(command.id);
		}
		return ANSWERED_WITHOUT_REGISTRY.has(command.id);
	}
	if (command.context === 'task') {
		return facts.answersRowKey(command.id);
	}
	if (command.context === 'chat') {
		return true;
	}
	// The list matches its row keys itself; a list command that is not a row key (saving the view) is the registry's.
	const isRowKey = Boolean(command.chordOnly) || Boolean(command.fixed);
	return isRowKey || facts.registryOn;
}

/**
 * The binding a key press of the command is matched against. The chat page reads the person's bindings whatever the
 * switch; the task list and the app's own listeners read the defaults while the registry is off.
 */
function bindingShown(
	command: ShortcutCommand,
	facts: ShortcutSheetFacts,
	defaults: ReadonlyMap<string, ShortcutBinding | null>
): ShortcutBinding | null {
	const readsPreferences = facts.registryOn || command.context === 'chat';
	if (readsPreferences) {
		return facts.bindings.get(command.id) ?? null;
	}
	return defaults.get(command.id) ?? null;
}

function registryLinesOf(facts: ShortcutSheetFacts): ShortcutSheetLine[] {
	const defaults = effectiveBindings(facts.commands, null);
	const lines: ShortcutSheetLine[] = [];
	for (const command of facts.commands) {
		if (!isAnswered(command, facts)) {
			continue;
		}
		const binding = bindingShown(command, facts, defaults);
		const keys: ShortcutKeys[] = [];
		if (binding) {
			keys.push(bindingKeyCaps(binding, facts.isMac));
		}
		lines.push({
			id: command.id,
			group: groupOfCommand(command),
			labelKey: `shortcuts.commands.${command.id}`,
			keys,
			command
		});
	}
	return lines;
}

function addWays(line: ShortcutSheetLine, ways: readonly ShortcutKeys[]): void {
	const listed = new Set(line.keys.map(signatureOf));
	for (const way of ways) {
		const signature = signatureOf(way);
		if (!listed.has(signature)) {
			listed.add(signature);
			line.keys.push(way);
		}
	}
}

/**
 * The lines of the legacy hotkeys bound right now. One that does what a listed registry command does (`H` for the
 * help, `C` for a new task) is added to that command's line as one more way to press it, never a second line.
 */
function hotkeyLinesOf(facts: ShortcutSheetFacts, registryLines: readonly ShortcutSheetLine[]): ShortcutSheetLine[] {
	const lines: ShortcutSheetLine[] = [];
	for (const group of facts.hotkeys) {
		for (const hotkey of group.keySequence) {
			const boundDeclaration = hotkey.boundAs ?? hotkey.keys;
			if (!facts.boundHotkeys.has(boundDeclaration)) {
				continue;
			}
			const ways = hotkeyKeys(hotkey.keys, facts.isMac);
			const doubledLine = registryLines.find((line) => line.id === hotkey.command);
			if (doubledLine) {
				addWays(doubledLine, ways);
				continue;
			}
			lines.push({
				id: `hotkey:${hotkey.label}`,
				group: group.group,
				labelKey: `hotkeys.${hotkey.label}`,
				keys: ways
			});
		}
	}
	return lines;
}

function ownKeyLinesOf(facts: ShortcutSheetFacts): ShortcutSheetLine[] {
	const lines: ShortcutSheetLine[] = [];
	for (const ownKey of facts.ownKeys) {
		const binding = parseBinding(ownKey.binding);
		if (!binding) {
			continue;
		}
		lines.push({
			id: ownKey.id,
			group: ownKey.group,
			labelKey: ownKey.labelKey,
			keys: [bindingKeyCaps(binding, facts.isMac)]
		});
	}
	return lines;
}

/**
 * The sheet: the groups that have a line, in order. Inside a group, the legacy hotkeys come first (creating and
 * assigning a task read before the keys of the list), then the registry's commands in its own order, then the keys
 * the components answer themselves.
 */
export function shortcutSheetOf(facts: ShortcutSheetFacts): ShortcutSheetSection[] {
	const registryLines = registryLinesOf(facts);
	const hotkeyLines = hotkeyLinesOf(facts, registryLines);
	const ownLines = ownKeyLinesOf(facts);
	const lines = [...hotkeyLines, ...registryLines, ...ownLines];
	const sections: ShortcutSheetSection[] = [];
	for (const group of SHORTCUT_SHEET_GROUPS) {
		const groupLines = lines.filter((line) => line.group === group);
		if (groupLines.length > 0) {
			sections.push({ group, lines: groupLines });
		}
	}
	return sections;
}
