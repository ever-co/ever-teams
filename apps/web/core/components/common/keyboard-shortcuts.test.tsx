/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockSetSheetOpen = jest.fn();

jest.mock('jotai', () => ({ useSetAtom: () => mockSetSheetOpen }));
jest.mock('@/core/stores/common/shortcuts', () => ({ shortcutsHelpOpenAtom: Symbol('shortcuts-help') }));
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({ isShortcutSequencePending: () => false }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({ Keyboard: () => null }));
jest.mock('../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));
jest.mock('./button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type="button" {...props}>
			{children}
		</button>
	)
}));

import { KeyboardShortcuts } from './keyboard-shortcuts';

function pressH() {
	const event = new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', keyCode: 72, bubbles: true });
	document.body.dispatchEvent(event);
}

describe('KeyboardShortcuts', () => {
	it('opens the one shortcuts sheet of the app, with no dialog and no key of its own', () => {
		render(<KeyboardShortcuts />);

		pressH();
		expect(mockSetSheetOpen).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'common.KEYBOARD_SHORTCUTS' }));
		expect(mockSetSheetOpen).toHaveBeenCalledWith(true);
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
