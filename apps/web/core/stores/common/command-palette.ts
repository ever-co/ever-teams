import { atom } from 'jotai';

/**
 * Whether the command palette is open. The palette (SidebarCommandModal) is mounted once for the whole
 * shell, next to the other global modals in app-sidebar.tsx, so its keyboard shortcuts work on every
 * page; the header's CommandPaletteTrigger (and anything else) opens it by setting this atom.
 */
export const commandPaletteOpenAtom = atom(false);
