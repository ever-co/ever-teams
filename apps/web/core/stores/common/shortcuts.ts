import { atom } from 'jotai';
import type { ShortcutContext } from '@/core/lib/keyboard/shortcuts';

/** The handler of a command, registered by the page or component that can run it. */
export type ShortcutHandler = () => void;

/** The handlers registered right now, by command id; a command without one does nothing when pressed. */
export const shortcutHandlersAtom = atom<Map<string, ShortcutHandler>>(new Map());

/** The contexts active right now besides `global` (the tasks list while it is mounted, a focused task, a view). */
export const shortcutContextsAtom = atom<ShortcutContext[]>([]);

/**
 * The keys components match themselves right now (the task list's rows, the chat page, the list search's `/`), by
 * command or key id: one entry per component whose listener is installed, so a key two of them answer stays until
 * both are gone. The shortcuts sheet lists these keys only while someone answers them.
 */
export const answeredKeysAtom = atom<readonly string[]>([]);

/** Whether the shortcuts help dialog is open. */
export const shortcutsHelpOpenAtom = atom(false);
