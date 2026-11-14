/** @jest-environment jsdom */

import React, { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { TASK_SEARCH_FOCUS_ID } from '@/core/components/tasks/task-search-field';
import { answeredKeysAtom } from '@/core/stores/common/shortcuts';
import { useClientsSearchKey } from './use-clients-search-key';

function SearchBox() {
	const boxRef = useRef<HTMLDivElement>(null);
	useClientsSearchKey(boxRef);
	return (
		<>
			<div ref={boxRef}>
				<input aria-label="search" />
			</div>
			<button type="button">list</button>
			<div role="dialog">
				<button type="button">in a dialog</button>
			</div>
			<div role="alertdialog">
				<button type="button">in an alert</button>
			</div>
		</>
	);
}

function search() {
	return screen.getByRole('textbox', { name: 'search' });
}

describe('the "/" key of the clients list', () => {
	it('is listed on the shortcuts sheet while the list answers it, and no longer once it is gone', () => {
		const { unmount } = render(<SearchBox />);

		expect(getDefaultStore().get(answeredKeysAtom)).toContain(TASK_SEARCH_FOCUS_ID);

		unmount();

		expect(getDefaultStore().get(answeredKeysAtom)).not.toContain(TASK_SEARCH_FOCUS_ID);
	});

	it('jumps into the search field from the list', () => {
		render(<SearchBox />);

		fireEvent.keyDown(screen.getByRole('button', { name: 'list' }), { key: '/' });

		expect(document.activeElement).toBe(search());
	});

	it('is left to a dialog it is pressed in', () => {
		render(<SearchBox />);

		fireEvent.keyDown(screen.getByRole('button', { name: 'in a dialog' }), { key: '/' });
		fireEvent.keyDown(screen.getByRole('button', { name: 'in an alert' }), { key: '/' });

		expect(document.activeElement).not.toBe(search());
	});

	it('is left alone once something else answered it', () => {
		render(<SearchBox />);
		const list = screen.getByRole('button', { name: 'list' });
		list.addEventListener('keydown', (event) => event.preventDefault());

		fireEvent.keyDown(list, { key: '/' });

		expect(document.activeElement).not.toBe(search());
	});
});
