import { atom } from 'jotai';
import type { ShortcutContext } from '@/core/lib/keyboard/shortcuts';

/** The handler of a command, registered by the page or component that can run it. */
export type ShortcutHandler = () => void;

/** The handlers registered right now, by command id; a command without one does nothing when pressed. */
export const shortcutHandlersAtom = atom<Map<string, ShortcutHandler>>(new Map());

/** The contexts active right now besides `global` (the tasks list while it is mounted, a focused task, a view). */
export const shortcutContextsAtom = atom<ShortcutContext[]>([]);

/** Whether the shortcuts help dialog is open. */
export const shortcutsHelpOpenAtom = atom(false);
