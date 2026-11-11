import { sameChord, type ShortcutBinding, type ShortcutChord } from '@/core/lib/keyboard/shortcuts';

/** The chat page's commands of the shortcut registry, in the order a key press is matched against them. */
export const CHAT_SHORTCUT_IDS = [
	'chatPreviousUnread',
	'chatNextUnread',
	'chatPrevious',
	'chatNext',
	'chatUnreads',
	'chatMarkAllRead'
] as const;

export type ChatShortcutId = (typeof CHAT_SHORTCUT_IDS)[number];

/**
 * The chat command a key press runs, with the bindings in force (the person's own, or the defaults), or null. In a text
 * field (the composer) only a chord with Alt or ⌘/Ctrl, or Escape, is a command: a plain key there is text.
 */
export function chatShortcutOf(
	chord: ShortcutChord,
	bindings: ReadonlyMap<string, ShortcutBinding | null>,
	inField: boolean
): ChatShortcutId | null {
	if (inField && !chord.mod && !chord.alt && chord.key !== 'escape') return null;
	for (const id of CHAT_SHORTCUT_IDS) {
		const binding = bindings.get(id);
		if (binding?.length === 1 && sameChord(binding[0], chord)) return id;
	}
	return null;
}
