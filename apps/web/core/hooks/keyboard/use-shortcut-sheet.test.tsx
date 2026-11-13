/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import type { ShortcutSheetLine, ShortcutSheetSection } from '@/core/lib/keyboard/shortcut-sheet';

let mockRegistryOn = false;
let mockBoundHotkeys = new Set<string>();
let mockRegistered = new Map<string, () => void>();
let mockAnswered = new Set<string>();

jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => {
	const { effectiveBindings, SHORTCUT_COMMANDS } = jest.requireActual('@/core/lib/keyboard/shortcuts');
	const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
	return { useKeyboardPreferences: () => ({ bindings, canRebind: mockRegistryOn }) };
});
jest.mock('@/core/hooks/common/use-detect-os', () => ({ useDetectOS: () => ({ os: 'Windows' }) }));
jest.mock('@/core/hooks/common/use-hotkeys', () => ({
	...jest.requireActual('@/core/hooks/common/use-hotkeys'),
	useBoundHotkeys: () => mockBoundHotkeys
}));
jest.mock('jotai', () => ({ ...jest.requireActual('jotai'), useAtomValue: () => mockRegistered }));
jest.mock('./use-answered-keys', () => ({ useAnsweredKeySet: () => mockAnswered }));

import { HostKeys } from '@/core/hooks/common/use-hotkeys';
import { useShortcutSheet } from './use-shortcut-sheet';

function sheet(): ShortcutSheetSection[] {
	const { result } = renderHook(() => useShortcutSheet());
	return result.current;
}

function lineOf(sections: ShortcutSheetSection[], id: string): ShortcutSheetLine | undefined {
	const lines = sections.flatMap((section) => section.lines);
	return lines.find((line) => line.id === id);
}

describe('useShortcutSheet', () => {
	afterEach(() => {
		mockRegistryOn = false;
		mockBoundHotkeys = new Set<string>();
		mockRegistered = new Map();
		mockAnswered = new Set<string>();
	});

	it('reads the keys components answer themselves from the constants their listeners match', () => {
		mockAnswered = new Set(['taskSearchFocus']);
		const sections = sheet();

		expect(lineOf(sections, 'sidebarToggle')?.keys).toEqual([[['Ctrl', 'B']]]);
		expect(lineOf(sections, 'taskSearchFocus')?.keys).toEqual([[['/']]]);
	});

	it('lists / only on a page whose list search answers it', () => {
		const sections = sheet();

		expect(lineOf(sections, 'sidebarToggle')).toBeDefined();
		expect(lineOf(sections, 'taskSearchFocus')).toBeUndefined();
	});

	it('lists a legacy hotkey from its declaration, only while a component has it bound', () => {
		expect(lineOf(sheet(), 'hotkey:START_TIMER')).toBeUndefined();

		mockBoundHotkeys = new Set([HostKeys.START_STOP_TIMER, HostKeys.SHORTCUT_LIST]);
		const sections = sheet();

		expect(lineOf(sections, 'hotkey:START_TIMER')?.keys).toEqual([[['Ctrl', 'Alt', ']']]]);
		expect(lineOf(sections, 'helpOpen')?.keys).toEqual([[['?']], [['H']]]);
	});

	it('asks the task list which row keys open a picker: the project one only with the registry', () => {
		expect(lineOf(sheet(), 'taskProject')).toBeUndefined();

		mockRegistryOn = true;
		mockRegistered = new Map([['paletteOpen', jest.fn()]]);
		const sections = sheet();

		expect(lineOf(sections, 'taskProject')?.keys).toEqual([[['M']]]);
		expect(lineOf(sections, 'paletteOpen')?.keys).toEqual([[['Ctrl', 'K']]]);
		expect(lineOf(sections, 'goTasks')).toBeUndefined();
	});
});
