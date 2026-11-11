import { effectiveBindings, formatBinding } from './shortcuts';
import { availableShortcutCommands } from './available-commands';

describe('availableShortcutCommands', () => {
	it("has the chat page's commands only where the chat is on", () => {
		expect(availableShortcutCommands(true).some((command) => command.context === 'chat')).toBe(true);
		expect(availableShortcutCommands(false).some((command) => command.context === 'chat')).toBe(false);
		expect(availableShortcutCommands(false).some((command) => command.id === 'paletteOpen')).toBe(true);
	});

	it('lets a person keep a key that only a hidden chat command would take', () => {
		const overrides = { paletteOpen: 'alt+arrowdown' };
		const without = effectiveBindings(availableShortcutCommands(false), overrides);
		expect(formatBinding(without.get('paletteOpen') ?? [])).toBe('alt+arrowdown');
		// With the chat on, the key is the chat's: the override clashes, and the default comes back.
		const withChat = effectiveBindings(availableShortcutCommands(true), overrides);
		expect(formatBinding(withChat.get('paletteOpen') ?? [])).toBe('mod+k');
	});
});
