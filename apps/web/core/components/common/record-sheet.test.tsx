/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({
	ChevronDown: () => null,
	ChevronUp: () => null,
	Expand: () => null,
	X: () => null
}));

import { useRecordSheetKeys } from './record-sheet';

function press(target: Element, key: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function buttonInside(attributes: Record<string, string>) {
	const host = document.createElement('div');
	for (const [name, value] of Object.entries(attributes)) {
		host.setAttribute(name, value);
	}
	const button = document.createElement('button');
	host.append(button);
	document.body.append(host);
	return button;
}

describe('useRecordSheetKeys', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('walks the list with J and K from inside the sheet', () => {
		const onNext = jest.fn();
		const onPrevious = jest.fn();
		renderHook(() => useRecordSheetKeys({ enabled: true, onNext, onPrevious }));
		const button = buttonInside({ role: 'dialog', 'data-record-sheet': '' });

		press(button, 'j');
		press(button, 'k');

		expect(onNext).toHaveBeenCalledTimes(1);
		expect(onPrevious).toHaveBeenCalledTimes(1);
	});

	it('leaves J and K to a dialog opened over the sheet', () => {
		const onNext = jest.fn();
		const onPrevious = jest.fn();
		renderHook(() => useRecordSheetKeys({ enabled: true, onNext, onPrevious }));
		const cancel = buttonInside({ role: 'dialog' });
		const confirm = buttonInside({ role: 'alertdialog' });

		press(cancel, 'j');
		press(confirm, 'k');

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrevious).not.toHaveBeenCalled();
	});
});
