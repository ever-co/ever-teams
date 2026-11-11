/** @jest-environment jsdom */

import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useInboxSheetFocus } from './use-inbox-sheet-focus';

let isLargeScreen = false;
const breakpointListeners = new Set<() => void>();

/** Resizes the window across the large breakpoint. */
function setLargeScreen(value: boolean) {
	isLargeScreen = value;
	act(() => breakpointListeners.forEach((listener) => listener()));
}

beforeEach(() => {
	isLargeScreen = false;
	breakpointListeners.clear();
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			get matches() {
				return isLargeScreen && query.includes('1024px');
			},
			media: query,
			addEventListener: (_type: string, listener: () => void) => breakpointListeners.add(listener),
			removeEventListener: (_type: string, listener: () => void) => breakpointListeners.delete(listener)
		})
	});
});

/** A row that opens the sheet, and the sheet with a text field and a close button, as the inbox page draws them. */
function Inbox({ onClosed }: Readonly<{ onClosed: () => void }>) {
	const [openId, setOpenId] = useState<string | null>(null);
	const { sheetRef, close } = useInboxSheetFocus(openId, () => {
		setOpenId(null);
		onClosed();
	});
	return (
		<>
			<button type="button" onClick={() => setOpenId('entry-1')}>
				row
			</button>
			{openId && (
				<div ref={sheetRef} role="dialog" tabIndex={-1}>
					<textarea aria-label="reason" />
					<button type="button" onClick={close}>
						close
					</button>
				</div>
			)}
		</>
	);
}

describe('useInboxSheetFocus', () => {
	it('moves the focus into the sheet when it opens, and back to the row when Escape closes it', () => {
		const onClosed = jest.fn();
		render(<Inbox onClosed={onClosed} />);
		const row = screen.getByRole('button', { name: 'row' });

		act(() => row.focus());
		fireEvent.click(row);
		expect(document.activeElement).toBe(screen.getByRole('dialog'));

		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(row);
	});

	it('leaves Escape to a text field being typed in, and gives the focus back when the close button closes it', () => {
		const onClosed = jest.fn();
		render(<Inbox onClosed={onClosed} />);
		const row = screen.getByRole('button', { name: 'row' });
		act(() => row.focus());
		fireEvent.click(row);

		const reason = screen.getByRole('textbox', { name: 'reason' });
		act(() => reason.focus());
		fireEvent.keyDown(reason, { key: 'Escape' });
		expect(onClosed).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'close' }));
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(row);
	});

	it('takes no focus on a large screen, where the entry shows in the pane, until the window narrows', () => {
		isLargeScreen = true;
		const onClosed = jest.fn();
		render(<Inbox onClosed={onClosed} />);
		const row = screen.getByRole('button', { name: 'row' });
		act(() => row.focus());
		fireEvent.click(row);
		expect(document.activeElement).toBe(row);

		// The same entry stays open while the window narrows below the breakpoint: the sheet now shows, and takes it.
		setLargeScreen(false);
		expect(document.activeElement).toBe(screen.getByRole('dialog'));
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(onClosed).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(row);
	});
});
