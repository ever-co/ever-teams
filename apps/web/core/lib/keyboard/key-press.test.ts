/** @jest-environment jsdom */

import { pressesBinding } from './key-press';
import { parseBinding } from './shortcuts';

const HELP = parseBinding('?');
const PALETTE = parseBinding('mod+k');

interface Press {
	key: string;
	code: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	target?: EventTarget | null;
	defaultPrevented?: boolean;
	isComposing?: boolean;
}

function pressOf(press: Press) {
	return {
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		target: document.body,
		defaultPrevented: false,
		isComposing: false,
		...press
	};
}

/** `?` as a US keyboard sends it: Shift and the slash key. */
function questionMark(changes: Partial<Press> = {}) {
	return pressOf({ key: '?', code: 'Slash', shiftKey: true, ...changes });
}

describe('pressesBinding, by the character typed', () => {
	it('takes the key of the binding pressed outside a field, whichever key prints it on the layout', () => {
		expect(pressesBinding(questionMark(), HELP, false)).toBe(true);
		// A French keyboard prints `?` with Shift on the key a US keyboard has M on.
		expect(pressesBinding(pressOf({ key: '?', code: 'KeyM', shiftKey: true }), HELP, false)).toBe(true);
		expect(pressesBinding(pressOf({ key: '/', code: 'Slash' }), HELP, false)).toBe(false);
	});

	it('leaves a bare key typed in a field, an editor or a select to the text', () => {
		const input = document.createElement('input');
		const textarea = document.createElement('textarea');
		const select = document.createElement('select');
		const editor = document.createElement('div');
		Object.defineProperty(editor, 'isContentEditable', { value: true });

		expect(pressesBinding(questionMark({ target: input }), HELP, false)).toBe(false);
		expect(pressesBinding(questionMark({ target: textarea }), HELP, false)).toBe(false);
		expect(pressesBinding(questionMark({ target: select }), HELP, false)).toBe(false);
		expect(pressesBinding(questionMark({ target: editor }), HELP, false)).toBe(false);
	});

	it('takes a chord with ⌘ or Ctrl in a field too', () => {
		const input = document.createElement('input');
		const press = pressOf({ key: 'k', code: 'KeyK', ctrlKey: true, target: input });
		expect(pressesBinding(press, PALETTE, false)).toBe(true);
	});

	it('leaves a press another listener took, and one made while a character is composed', () => {
		expect(pressesBinding(questionMark({ defaultPrevented: true }), HELP, false)).toBe(false);
		expect(pressesBinding(questionMark({ isComposing: true }), HELP, false)).toBe(false);
	});

	it('matches no sequence, no missing binding, and no modifier pressed alone', () => {
		expect(pressesBinding(pressOf({ key: 'g', code: 'KeyG' }), parseBinding('g t'), false)).toBe(false);
		expect(pressesBinding(questionMark(), null, false)).toBe(false);
		expect(pressesBinding(pressOf({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }), HELP, false)).toBe(false);
	});
});

describe('pressesBinding, by the physical key', () => {
	it('reads a letter by the key pressed, whatever the layout prints', () => {
		const press = pressOf({ key: 'л', code: 'KeyK', ctrlKey: true });
		expect(pressesBinding(press, PALETTE, true)).toBe(true);
		expect(pressesBinding(press, PALETTE, false)).toBe(false);
	});
});
