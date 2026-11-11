import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { SHORTCUT_COMMANDS, type ShortcutCommand } from './shortcuts';

/**
 * The registry's commands this deployment has: the chat page's only where the chat is on. The bindings in force and
 * the conflicts of a rebinding are worked out over these, so a key a hidden feature would take never displaces one the
 * person set for a command they can use.
 */
export function availableShortcutCommands(chatOn: boolean = isChatEnabled()): readonly ShortcutCommand[] {
	if (chatOn) return SHORTCUT_COMMANDS;
	return SHORTCUT_COMMANDS.filter((command) => command.context !== 'chat');
}
