/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

const mockSetOverrides = jest.fn<Promise<void>, [Record<string, string>]>(async () => undefined);
const mockToast = { error: jest.fn(), success: jest.fn() };
// Stable across renders, as the hook's memo is: a recording restarts when the bindings change.
let mockPreferences: { bindings: ReturnType<typeof effectiveBindings>; overrides: Record<string, string> } | null =
	null;

jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => ({
	useKeyboardPreferences: () => {
		mockPreferences ??= { bindings: effectiveBindings(SHORTCUT_COMMANDS, null), overrides: {} };
		return { ...mockPreferences, setOverrides: mockSetOverrides, canRebind: true };
	}
}));
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

async function record(commandId: string, presses: Array<{ code: string; key: string; shiftKey?: boolean }>) {
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

	it('refuses a key the list keeps for itself', async () => {
		render(<ShortcutsDialog />);
		await record('listDown', [{ code: 'KeyO', key: 'o' }]);
		expect(mockToast.error).toHaveBeenCalledWith('shortcuts.LIST_KEY');
		expect(mockSetOverrides).not.toHaveBeenCalled();
	});

	it('saves one new key for a list command, and a sequence for a "go to"', async () => {
		render(<ShortcutsDialog />);
		await record('listDown', [{ code: 'KeyN', key: 'n' }]);
		expect(mockSetOverrides).toHaveBeenLastCalledWith({ listDown: 'n' });
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
