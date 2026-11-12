/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

const mockSetOverrides = jest.fn<Promise<void>, [Record<string, string>]>(async () => undefined);
const mockToast = { error: jest.fn(), success: jest.fn() };
// Stable across renders, as the hook's memo is: a recording restarts when the bindings change.
let mockPreferences: { bindings: ReturnType<typeof effectiveBindings>; overrides: Record<string, string> } | null =
	null;

// The saved-views feature: the registry's listener is mounted and a person can change a binding.
let mockRegistryOn = true;
// The legacy hotkeys a component of the page has bound: the help's `H` always, the timer's where a timer is drawn.
let mockBoundHotkeys = new Set<string>(['shift+h,h']);

jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => ({
	useKeyboardPreferences: () => {
		mockPreferences ??= { bindings: effectiveBindings(SHORTCUT_COMMANDS, null), overrides: {} };
		return { ...mockPreferences, setOverrides: mockSetOverrides, canRebind: mockRegistryOn };
	}
}));
// The sheet's lines come from the real rule, with every registry command answered by someone.
jest.mock('@/core/hooks/keyboard/use-shortcut-sheet', () => {
	const { shortcutSheetOf } = jest.requireActual('@/core/lib/keyboard/shortcut-sheet');
	const { availableShortcutCommands } = jest.requireActual('@/core/lib/keyboard/available-commands');
	const shortcuts = jest.requireActual('@/core/lib/keyboard/shortcuts');
	const timerKeys = 'ctrl+alt+],ctrl+alt+[';
	return {
		useShortcutSheet: () => {
			const commands = availableShortcutCommands();
			return shortcutSheetOf({
				isMac: false,
				registryOn: mockRegistryOn,
				commands,
				bindings: shortcuts.effectiveBindings(commands, null),
				registered: { has: () => true },
				answersRowKey: () => true,
				hotkeys: [
					{
						group: 'general',
						keySequence: [{ label: 'TO_OPEN_SHORTCUT_LIST', keys: 'shift+h,h', command: 'helpOpen' }]
					},
					{
						group: 'timer',
						keySequence: [
							{ label: 'START_TIMER', keys: 'ctrl+alt+]', boundAs: timerKeys },
							{ label: 'STOP_TIMER', keys: 'ctrl+alt+[', boundAs: timerKeys }
						]
					}
				],
				boundHotkeys: mockBoundHotkeys,
				ownKeys: [
					{
						id: 'sidebarToggle',
						group: 'general',
						labelKey: 'shortcuts.commands.sidebarToggle',
						binding: 'mod+b'
					}
				]
			});
		}
	};
});
jest.mock('@/core/components/common/command', () => ({ commandKeycapClass: 'keycap' }));
jest.mock('jotai', () => ({ useAtom: () => [true, jest.fn()] }));
jest.mock('@/core/stores/common/shortcuts', () => ({ shortcutsHelpOpenAtom: Symbol('shortcuts-help') }));
const mockT = (key: string) => key;
jest.mock('next-intl', () => ({ useTranslations: () => mockT }));
jest.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockToast.error(...args),
		success: (...args: unknown[]) => mockToast.success(...args)
	}
}));
jest.mock('@/core/lib/helpers', () => ({
	cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));
// The dialog's content renders inline: the rows and their buttons are what this suite reads.
jest.mock('@/core/components/common/dialog', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return { Dialog: Pass, DialogContent: Pass, DialogDescription: Pass, DialogHeader: Pass, DialogTitle: Pass };
});
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({
		children,
		onClick,
		disabled
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
	}) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	)
}));

import { ShortcutsDialog } from './shortcuts-dialog';

/** The row of a command in the help: its label's line. */
function rowOf(commandId: string): HTMLElement {
	const label = screen.getByText(`shortcuts.commands.${commandId}`);
	return label.parentElement as HTMLElement;
}

function changeButtonOf(commandId: string): HTMLButtonElement | null {
	const buttons = Array.from(rowOf(commandId).querySelectorAll('button'));
	return buttons.find((button) => button.textContent === 'shortcuts.CHANGE') ?? null;
}

async function record(
	commandId: string,
	presses: Array<{ code: string; key: string; shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean }>
) {
	fireEvent.click(changeButtonOf(commandId)!);
	for (const press of presses) fireEvent.keyDown(window, press);
	// A single chord is kept once the window for a second one has passed.
	await act(async () => {
		jest.advanceTimersByTime(1000);
	});
}

describe('ShortcutsDialog rebinding', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it('offers a change for the list letters, never for the built-in keys', () => {
		render(<ShortcutsDialog />);
		for (const id of [
			'listDown',
			'listUp',
			'listSelect',
			'taskStatus',
			'taskPriority',
			'taskLabels',
			'taskDueDate'
		]) {
			expect(changeButtonOf(id)).not.toBeNull();
		}
		expect(changeButtonOf('listOpen')).toBeNull();
		expect(changeButtonOf('listClear')).toBeNull();
		expect(changeButtonOf('taskCreate')).toBeNull();
	});

	it('refuses a sequence for a list or task key, with the reason', async () => {
		render(<ShortcutsDialog />);
		await record('listDown', [
			{ code: 'KeyG', key: 'g' },
			{ code: 'KeyJ', key: 'j' }
		]);
		await record('taskStatus', [
			{ code: 'KeyG', key: 'g' },
			{ code: 'KeyS', key: 's' }
		]);
		expect(mockToast.error).toHaveBeenCalledTimes(2);
		expect(mockToast.error).toHaveBeenNthCalledWith(1, 'shortcuts.SINGLE_KEY_ONLY');
		expect(mockToast.error).toHaveBeenNthCalledWith(2, 'shortcuts.SINGLE_KEY_ONLY');
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});

	it('refuses a key the list keeps for itself, and ⌘/Ctrl for a list key', async () => {
		render(<ShortcutsDialog />);
		await record('listDown', [{ code: 'KeyO', key: 'o' }]);
		await record('listDown', [{ code: 'KeyB', key: 'b', ctrlKey: true }]);
		expect(mockToast.error).toHaveBeenNthCalledWith(1, 'shortcuts.LIST_KEY');
		expect(mockToast.error).toHaveBeenNthCalledWith(2, 'shortcuts.NO_MOD_KEY');
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});

	it('saves one new key for a list command, and a sequence for a "go to"', async () => {
		render(<ShortcutsDialog />);
		await record('listDown', [{ code: 'KeyB', key: 'b' }]);
		expect(mockSetOverrides).toHaveBeenLastCalledWith({ listDown: 'b' });
		await record('goTasks', [
			{ code: 'KeyG', key: 'g' },
			{ code: 'KeyX', key: 'x' }
		]);
		expect(mockSetOverrides).toHaveBeenLastCalledWith({ goTasks: 'g x' });
		expect(mockToast.error).not.toHaveBeenCalled();
	});

	it('names the command that already holds the key, Shift+J included', async () => {
		render(<ShortcutsDialog />);
		await record('taskStatus', [{ code: 'KeyJ', key: 'j' }]);
		await record('taskDueDate', [{ code: 'KeyJ', key: 'J', shiftKey: true }]);
		expect(mockToast.error).toHaveBeenNthCalledWith(1, 'shortcuts.CONFLICT');
		expect(mockToast.error).toHaveBeenNthCalledWith(2, 'shortcuts.CONFLICT');
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});
});

describe('ShortcutsDialog, the chat keys', () => {
	const flag = process.env.NEXT_PUBLIC_CHAT_ENABLED;
	beforeEach(() => {
		jest.useFakeTimers();
		process.env.NEXT_PUBLIC_CHAT_ENABLED = 'true';
	});
	afterEach(() => {
		jest.useRealTimers();
		if (flag === undefined) delete process.env.NEXT_PUBLIC_CHAT_ENABLED;
		else process.env.NEXT_PUBLIC_CHAT_ENABLED = flag;
	});

	it('lists them where the chat is on', () => {
		render(<ShortcutsDialog />);
		expect(screen.getByText('shortcuts.commands.chatNext')).toBeTruthy();
		expect(changeButtonOf('chatMarkAllRead')).not.toBeNull();
	});

	it('records Escape with a modifier as a key, and stops on a plain Escape', async () => {
		render(<ShortcutsDialog />);
		// Shift+Escape is a key: recorded for "next conversation", it clashes with "mark all read".
		await record('chatNext', [{ code: 'Escape', key: 'Escape', shiftKey: true }]);
		expect(mockToast.error).toHaveBeenCalledWith('shortcuts.CONFLICT');
		mockToast.error.mockClear();
		await record('chatNext', [{ code: 'Escape', key: 'Escape' }]);
		expect(mockToast.error).not.toHaveBeenCalled();
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});

	it('refuses a chord the chat page already answers', async () => {
		render(<ShortcutsDialog />);
		await record('chatNext', [{ code: 'KeyB', key: 'b', ctrlKey: true }]);
		expect(mockToast.error).toHaveBeenCalledWith('shortcuts.CHAT_TAKEN');
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});
});

describe('ShortcutsDialog without the chat', () => {
	it('lists no chat key', () => {
		render(<ShortcutsDialog />);
		expect(screen.queryByText('shortcuts.commands.chatNext')).toBeNull();
	});
});

/** The key caps a line shows, read next to its label. */
function keyCapsOf(labelKey: string): string[] {
	const row = screen.getByText(labelKey).parentElement as HTMLElement;
	return Array.from(row.querySelectorAll('kbd')).map((cap) => cap.textContent ?? '');
}

/** The names of the groups the sheet lists, in order. */
function groupsListed(): string[] {
	return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '');
}

function layoutOfSheet(): string | null | undefined {
	const [firstGroup] = screen.getAllByRole('heading', { level: 3 });
	return firstGroup.closest('[data-layout]')?.getAttribute('data-layout');
}

describe('ShortcutsDialog, one sheet for every key', () => {
	afterEach(() => {
		mockRegistryOn = true;
		mockBoundHotkeys = new Set<string>(['shift+h,h']);
	});

	it('lists the keys by group: General, Timer, Tasks, Navigation, and no group without a key', () => {
		const first = render(<ShortcutsDialog />);
		expect(groupsListed()).toEqual([
			'shortcuts.groups.general',
			'shortcuts.groups.tasks',
			'shortcuts.groups.navigation'
		]);
		first.unmount();

		mockBoundHotkeys = new Set<string>(['shift+h,h', 'ctrl+alt+],ctrl+alt+[']);
		render(<ShortcutsDialog />);
		expect(groupsListed()).toEqual([
			'shortcuts.groups.general',
			'shortcuts.groups.timer',
			'shortcuts.groups.tasks',
			'shortcuts.groups.navigation'
		]);
		expect(keyCapsOf('hotkeys.START_TIMER')).toEqual(['Ctrl', 'Alt', ']']);
		expect(keyCapsOf('hotkeys.STOP_TIMER')).toEqual(['Ctrl', 'Alt', '[']);
	});

	it('shows every way to press a shortcut: the two keys of the help with "or", the chords of a sequence with "then"', () => {
		render(<ShortcutsDialog />);

		expect(keyCapsOf('shortcuts.commands.helpOpen')).toEqual(['?', 'H']);
		expect(rowOf('helpOpen').textContent).toContain('shortcuts.OR');
		expect(keyCapsOf('shortcuts.commands.goTasks')).toEqual(['G', 'T']);
		expect(rowOf('goTasks').textContent).toContain('shortcuts.THEN');
		expect(keyCapsOf('shortcuts.commands.sidebarToggle')).toEqual(['Ctrl', 'B']);
	});

	it('offers a change only for a command of the registry: never for a legacy hotkey or a key of a component', () => {
		mockBoundHotkeys = new Set<string>(['shift+h,h', 'ctrl+alt+],ctrl+alt+[']);
		render(<ShortcutsDialog />);

		expect(changeButtonOf('goTasks')).not.toBeNull();
		expect(changeButtonOf('sidebarToggle')).toBeNull();
		const timerRow = screen.getByText('hotkeys.START_TIMER').parentElement as HTMLElement;
		expect(timerRow.querySelector('button')).toBeNull();
	});

	it('sets the groups in columns when nothing can be changed, and in one column when the lines carry Change', () => {
		mockRegistryOn = false;
		const first = render(<ShortcutsDialog />);
		expect(layoutOfSheet()).toBe('columns');
		first.unmount();

		mockRegistryOn = true;
		render(<ShortcutsDialog />);
		expect(layoutOfSheet()).toBe('oneColumn');
	});

	it('with the registry off, lists what the app answers by itself, with nothing to change', () => {
		mockRegistryOn = false;
		render(<ShortcutsDialog />);

		expect(groupsListed()).toEqual(['shortcuts.groups.general', 'shortcuts.groups.tasks']);
		expect(keyCapsOf('shortcuts.commands.paletteOpen')).toEqual(['Ctrl', 'K']);
		expect(keyCapsOf('shortcuts.commands.helpOpen')).toEqual(['?', 'H']);
		expect(keyCapsOf('shortcuts.commands.listDown')).toEqual(['J']);
		expect(screen.queryByText('shortcuts.commands.goTasks')).toBeNull();
		expect(screen.queryByText('shortcuts.CHANGE')).toBeNull();
		expect(screen.getByText('shortcuts.DESCRIPTION')).toBeTruthy();
	});
});
