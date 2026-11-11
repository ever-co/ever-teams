import {
	chordOfEvent,
	effectiveBindings,
	parseBinding,
	parseChord,
	refusalOf,
	SHORTCUT_COMMANDS
} from '@/core/lib/keyboard/shortcuts';
import { CHAT_SHORTCUT_IDS, chatShortcutOf } from './chat-shortcuts';

const defaults = effectiveBindings(SHORTCUT_COMMANDS, {});
const chord = (text: string) => {
	const parsed = parseChord(text);
	if (!parsed) throw new Error(`not a chord: ${text}`);
	return parsed;
};

describe('the chat commands of the registry', () => {
	it('are all registered in the chat context with the keys of the spec', () => {
		const byId = new Map(SHORTCUT_COMMANDS.map((command) => [command.id, command]));
		for (const id of CHAT_SHORTCUT_IDS) expect(byId.get(id)?.context).toBe('chat');
		expect(byId.get('chatPrevious')?.defaultBinding).toBe('alt+arrowup');
		expect(byId.get('chatNext')?.defaultBinding).toBe('alt+arrowdown');
		expect(byId.get('chatPreviousUnread')?.defaultBinding).toBe('alt+shift+arrowup');
		expect(byId.get('chatNextUnread')?.defaultBinding).toBe('alt+shift+arrowdown');
		expect(byId.get('chatUnreads')?.defaultBinding).toBe('mod+shift+a');
		expect(byId.get('chatMarkAllRead')?.defaultBinding).toBe('shift+escape');
	});
});

describe('chatShortcutOf', () => {
	it('finds the command of a key press with the default bindings', () => {
		expect(chatShortcutOf(chord('alt+arrowdown'), defaults, false)).toBe('chatNext');
		expect(chatShortcutOf(chord('alt+shift+arrowdown'), defaults, false)).toBe('chatNextUnread');
		expect(chatShortcutOf(chord('alt+shift+arrowup'), defaults, false)).toBe('chatPreviousUnread');
		expect(chatShortcutOf(chord('mod+shift+a'), defaults, false)).toBe('chatUnreads');
		expect(chatShortcutOf(chord('shift+escape'), defaults, false)).toBe('chatMarkAllRead');
		expect(chatShortcutOf(chord('arrowdown'), defaults, false)).toBeNull();
	});

	it('reads a real key press, a letter by its physical key', () => {
		const event = { key: 'Å', code: 'KeyA', metaKey: false, ctrlKey: true, shiftKey: true, altKey: false };
		expect(chatShortcutOf(chordOfEvent(event) ?? chord('x'), defaults, false)).toBe('chatUnreads');
	});

	it('takes only chords with Alt or Ctrl/⌘, or Escape, in the composer', () => {
		expect(chatShortcutOf(chord('alt+arrowup'), defaults, true)).toBe('chatPrevious');
		expect(chatShortcutOf(chord('shift+escape'), defaults, true)).toBe('chatMarkAllRead');
		const typed = effectiveBindings(SHORTCUT_COMMANDS, { chatNext: 'n' });
		expect(chatShortcutOf(chord('n'), typed, false)).toBe('chatNext');
		expect(chatShortcutOf(chord('n'), typed, true)).toBeNull();
	});

	it('follows a rebinding, and a command the person turned off', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { chatNext: 'alt+j', chatMarkAllRead: '' });
		expect(chatShortcutOf(chord('alt+j'), bindings, false)).toBe('chatNext');
		expect(chatShortcutOf(chord('alt+arrowdown'), bindings, false)).toBeNull();
		expect(chatShortcutOf(chord('shift+escape'), bindings, false)).toBeNull();
	});
});

describe('rebinding a chat command', () => {
	const command = (id: string) => {
		const found = SHORTCUT_COMMANDS.find((item) => item.id === id);
		if (!found) throw new Error(`no command ${id}`);
		return found;
	};
	const binding = (text: string) => parseBinding(text) ?? [];

	it('takes one chord, never a sequence', () => {
		expect(refusalOf(command('chatNext'), binding('g n'))).toBe('chatSequence');
		expect(refusalOf(command('chatNext'), binding('alt+n'))).toBeNull();
	});

	it('takes Escape, which only the task list keeps for itself', () => {
		expect(refusalOf(command('chatMarkAllRead'), binding('shift+escape'))).toBeNull();
		expect(refusalOf(command('goTasks'), binding('escape'))).toBe('listKey');
	});

	it('takes no chord the chat page already answers: formatting, the sidebar, sending, moving', () => {
		for (const taken of [
			'mod+b',
			'mod+i',
			'mod+e',
			'mod+z',
			'enter',
			'mod+enter',
			'arrowdown',
			'escape',
			'space',
			'mod+arrowleft',
			'mod+backspace',
			'alt+backspace',
			'alt+arrowright',
			'alt+shift+arrowleft',
			'shift+arrowup'
		]) {
			expect(refusalOf(command('chatNext'), binding(taken))).toBe('chatTaken');
		}
		expect(refusalOf(command('chatNext'), binding('alt+arrowdown'))).toBeNull();
		expect(refusalOf(command('chatMarkAllRead'), binding('shift+escape'))).toBeNull();
		// A saved override on such a chord leaves the default in force.
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { chatNext: 'mod+b' });
		expect(chatShortcutOf(chord('alt+arrowdown'), bindings, false)).toBe('chatNext');
		expect(chatShortcutOf(chord('mod+b'), bindings, false)).toBeNull();
	});

	it('keeps the default where an override would be a sequence', () => {
		const bindings = effectiveBindings(SHORTCUT_COMMANDS, { chatUnreads: 'g u' });
		expect(chatShortcutOf(chord('mod+shift+a'), bindings, false)).toBe('chatUnreads');
	});
});
