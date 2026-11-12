import { effectiveBindings, SHORTCUT_COMMANDS } from './shortcuts';
import {
	hotkeyKeys,
	shortcutSheetOf,
	type HotkeyGroup,
	type ShortcutSheetFacts,
	type ShortcutSheetGroup,
	type ShortcutSheetLine
} from './shortcut-sheet';

const TIMER_KEYS = 'ctrl+option+],ctrl+alt+],ctrl+option+[,ctrl+alt+[';

const HOTKEYS: HotkeyGroup[] = [
	{ group: 'general', keySequence: [{ label: 'TO_OPEN_SHORTCUT_LIST', keys: 'shift+h,h', command: 'helpOpen' }] },
	{
		group: 'timer',
		keySequence: [
			{ label: 'START_TIMER', keys: 'ctrl+option+],ctrl+alt+]', boundAs: TIMER_KEYS },
			{ label: 'STOP_TIMER', keys: 'ctrl+option+[,ctrl+alt+[', boundAs: TIMER_KEYS }
		]
	},
	{
		group: 'tasks',
		keySequence: [
			{ label: 'ASSIGN_TASK', keys: 'shift+a,a' },
			{ label: 'CREATE_TASK', keys: 'shift+c,c', command: 'taskCreate' }
		]
	}
];

const WITHOUT_CHAT = SHORTCUT_COMMANDS.filter((command) => command.context !== 'chat');

/** The pickers a focused row opens without the registry: the project one comes with it. */
const ROW_KEYS_WITHOUT_REGISTRY = new Set(['taskStatus', 'taskPriority', 'taskLabels', 'taskDueDate']);

function factsOf(changes: Partial<ShortcutSheetFacts> = {}): ShortcutSheetFacts {
	return {
		isMac: true,
		registryOn: false,
		commands: WITHOUT_CHAT,
		bindings: effectiveBindings(WITHOUT_CHAT, null),
		registered: new Set<string>(),
		answersRowKey: (commandId) => ROW_KEYS_WITHOUT_REGISTRY.has(commandId),
		hotkeys: HOTKEYS,
		boundHotkeys: new Set(['shift+h,h']),
		ownKeys: [
			{ id: 'sidebarToggle', group: 'general', labelKey: 'shortcuts.commands.sidebarToggle', binding: 'mod+b' }
		],
		...changes
	};
}

function linesOf(facts: ShortcutSheetFacts, group: ShortcutSheetGroup): ShortcutSheetLine[] {
	const section = shortcutSheetOf(facts).find((item) => item.group === group);
	return section?.lines ?? [];
}

function idsOf(facts: ShortcutSheetFacts, group: ShortcutSheetGroup): string[] {
	return linesOf(facts, group).map((line) => line.id);
}

function lineOf(facts: ShortcutSheetFacts, group: ShortcutSheetGroup, id: string): ShortcutSheetLine | undefined {
	return linesOf(facts, group).find((line) => line.id === id);
}

describe('hotkeyKeys', () => {
	it('reads a legacy declaration with the keys of the system: Control and Option on a Mac, Ctrl and Alt elsewhere', () => {
		expect(hotkeyKeys('ctrl+option+],ctrl+alt+]', true)).toEqual([[['⌃', '⌥', ']']]]);
		expect(hotkeyKeys('ctrl+option+],ctrl+alt+]', false)).toEqual([[['Ctrl', 'Alt', ']']]]);
	});

	it('does not count the same key held with Shift as another way', () => {
		expect(hotkeyKeys('shift+h,h', true)).toEqual([[['H']]]);
		expect(hotkeyKeys('shift+a,a', false)).toEqual([[['A']]]);
	});

	it('keeps a chord with Shift that has no plain twin, and two different chords as two ways', () => {
		expect(hotkeyKeys('shift+d', false)).toEqual([[['Shift', 'D']]]);
		expect(hotkeyKeys('ctrl+alt+],ctrl+alt+[', false)).toEqual([[['Ctrl', 'Alt', ']']], [['Ctrl', 'Alt', '[']]]);
	});
});

describe('shortcutSheetOf, the registry off', () => {
	it('lists under General what the app answers by itself: the palette, the help with both its keys, the sidebar', () => {
		const facts = factsOf();
		expect(idsOf(facts, 'general')).toEqual(['paletteOpen', 'helpOpen', 'sidebarToggle']);
		expect(lineOf(facts, 'general', 'paletteOpen')?.keys).toEqual([[['⌘', 'K']]]);
		expect(lineOf(facts, 'general', 'helpOpen')?.keys).toEqual([[['?']], [['H']]]);
		expect(lineOf(facts, 'general', 'sidebarToggle')?.keys).toEqual([[['⌘', 'B']]]);
	});

	it('lists no key of the registry listener: no "go to", no settings, no theme', () => {
		const groups = shortcutSheetOf(factsOf()).map((section) => section.group);
		expect(groups).toEqual(['general', 'tasks']);
		expect(idsOf(factsOf(), 'general')).not.toContain('themeToggle');
	});

	it('lists the keys the task list matches itself, and no key that needs the registry', () => {
		const ids = idsOf(factsOf(), 'tasks');
		expect(ids).toEqual([
			'listDown',
			'listUp',
			'listOpen',
			'listSelect',
			'listClear',
			'taskStatus',
			'taskPriority',
			'taskLabels',
			'taskDueDate'
		]);
	});

	it('reads the list keys from the defaults: a binding the person once changed is not in force without the registry', () => {
		const bindings = effectiveBindings(WITHOUT_CHAT, { listDown: 'b' });
		expect(lineOf(factsOf({ bindings }), 'tasks', 'listDown')?.keys).toEqual([[['J']]]);
		expect(lineOf(factsOf({ bindings, registryOn: true }), 'tasks', 'listDown')?.keys).toEqual([[['B']]]);
	});

	it('lists a legacy hotkey only while its component has it bound', () => {
		expect(idsOf(factsOf(), 'timer')).toEqual([]);
		expect(idsOf(factsOf(), 'tasks')).not.toContain('hotkey:ASSIGN_TASK');

		const bound = factsOf({ boundHotkeys: new Set(['shift+h,h', TIMER_KEYS, 'shift+a,a', 'shift+c,c']) });
		expect(idsOf(bound, 'timer')).toEqual(['hotkey:START_TIMER', 'hotkey:STOP_TIMER']);
		expect(lineOf(bound, 'timer', 'hotkey:START_TIMER')?.keys).toEqual([[['⌃', '⌥', ']']]]);
		expect(lineOf(bound, 'timer', 'hotkey:STOP_TIMER')?.keys).toEqual([[['⌃', '⌥', '[']]]);
		expect(lineOf(bound, 'timer', 'hotkey:START_TIMER')?.labelKey).toBe('hotkeys.START_TIMER');
		// Creating and assigning a task read before the keys of the list.
		expect(idsOf(bound, 'tasks').slice(0, 3)).toEqual(['hotkey:ASSIGN_TASK', 'hotkey:CREATE_TASK', 'listDown']);
	});

	it('lists the help under its one key when nothing binds the legacy one', () => {
		const facts = factsOf({ boundHotkeys: new Set<string>() });
		expect(lineOf(facts, 'general', 'helpOpen')?.keys).toEqual([[['?']]]);
	});
});

describe('shortcutSheetOf, the registry on', () => {
	const registered = new Set(['paletteOpen', 'helpOpen', 'taskCreate', 'settingsOpen', 'goTasks', 'themeToggle']);

	function withRegistry(changes: Partial<ShortcutSheetFacts> = {}): ShortcutSheetFacts {
		return factsOf({ registryOn: true, registered, answersRowKey: () => true, ...changes });
	}

	it('lists a global command only while a handler is registered for it', () => {
		const facts = withRegistry();
		expect(idsOf(facts, 'general')).toEqual(['paletteOpen', 'helpOpen', 'themeToggle', 'sidebarToggle']);
		expect(idsOf(facts, 'navigation')).toEqual(['settingsOpen', 'goTasks']);
		expect(idsOf(facts, 'navigation')).not.toContain('goTimesheets');
		expect(idsOf(facts, 'general')).not.toContain('inviteUser');
	});

	it('lists the keys that came with the registry: saving the view, the project of a task', () => {
		const ids = idsOf(withRegistry(), 'tasks');
		expect(ids).toContain('listSaveView');
		expect(ids).toContain('taskProject');
	});

	it('shows the binding in force, and keeps the line of a command the person left without a key', () => {
		const bindings = effectiveBindings(WITHOUT_CHAT, { goTasks: 'g x', themeToggle: '' });
		const facts = withRegistry({ bindings });
		expect(lineOf(facts, 'navigation', 'goTasks')?.keys).toEqual([[['G'], ['X']]]);
		expect(lineOf(facts, 'general', 'themeToggle')?.keys).toEqual([]);
		expect(lineOf(facts, 'general', 'themeToggle')?.command?.id).toBe('themeToggle');
	});

	it('adds a legacy hotkey to the line of the command it doubles, never as a second line or a second same key', () => {
		const facts = withRegistry({ boundHotkeys: new Set(['shift+h,h', 'shift+c,c']) });
		expect(lineOf(facts, 'general', 'helpOpen')?.keys).toEqual([[['?']], [['H']]]);
		expect(lineOf(facts, 'tasks', 'taskCreate')?.keys).toEqual([[['C']]]);
		expect(idsOf(facts, 'tasks')).not.toContain('hotkey:CREATE_TASK');
	});

	it('shows Ctrl where the system has no ⌘', () => {
		const facts = withRegistry({ isMac: false });
		expect(lineOf(facts, 'general', 'paletteOpen')?.keys).toEqual([[['Ctrl', 'K']]]);
		expect(lineOf(facts, 'navigation', 'settingsOpen')?.keys).toEqual([[['Ctrl', ',']]]);
	});
});

describe('shortcutSheetOf, the chat', () => {
	it('lists the chat keys where the chat is on, with the binding the person set whatever the registry', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { chatUnreads: 'alt+u' });
		const facts = factsOf({ commands: SHORTCUT_COMMANDS, bindings });
		expect(idsOf(facts, 'chat')).toContain('chatNext');
		expect(lineOf(facts, 'chat', 'chatUnreads')?.keys).toEqual([[['⌥', 'U']]]);
	});

	it('lists none where it is off', () => {
		expect(idsOf(factsOf(), 'chat')).toEqual([]);
	});
});
