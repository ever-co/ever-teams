/** @jest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { AuthCodeInputField } from './auth-code-input';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

const WRONG_CODE = 'AB12CD3X';
const RIGHT_CODE = 'AB12CD34';

function renderCodeBoxes() {
	const typed = { code: '' };
	const keep = (code: string) => {
		typed.code = code;
	};
	const { container } = render(<AuthCodeInputField length={8} autoFocus={false} onChange={keep} />);
	const boxes = Array.from(container.querySelectorAll('input'));
	return { boxes, typed };
}

/**
 * A person types one character in the box that has the focus. A browser sends no change event when the character is
 * the one the box already holds, selected: only the key goes down.
 */
function typeCharacter(character: string) {
	const box = document.activeElement as HTMLInputElement;
	const isSameCharacter = box.value === character;
	const wasStopped = !fireEvent.keyDown(box, { key: character });
	if (isSameCharacter || wasStopped) {
		return;
	}
	fireEvent.change(box, { target: { value: character } });
}

function typeCodeFromFirstBox(boxes: HTMLInputElement[], code: string) {
	boxes[0].focus();
	for (const character of code) {
		typeCharacter(character);
	}
}

describe('AuthCodeInputField (#5681)', () => {
	it('takes a code typed box after box', () => {
		const { boxes, typed } = renderCodeBoxes();

		typeCodeFromFirstBox(boxes, WRONG_CODE);

		expect(typed.code).toBe(WRONG_CODE);
	});

	it('replaces a refused code with the right one typed again from the first box', () => {
		const { boxes, typed } = renderCodeBoxes();
		typeCodeFromFirstBox(boxes, WRONG_CODE);

		typeCodeFromFirstBox(boxes, RIGHT_CODE);

		expect(boxes.map((box) => box.value).join('')).toBe(RIGHT_CODE);
		expect(typed.code).toBe(RIGHT_CODE);
	});

	it('moves on from a box whose character is typed again, and leaves the next box as it is', () => {
		const { boxes } = renderCodeBoxes();
		typeCodeFromFirstBox(boxes, WRONG_CODE);
		boxes[0].focus();

		typeCharacter('A');

		expect(document.activeElement).toBe(boxes[1]);
		expect(boxes[1].value).toBe('B');
	});

	it('keeps Backspace as it was: it empties the box, then steps back', () => {
		const { boxes, typed } = renderCodeBoxes();
		typeCodeFromFirstBox(boxes, WRONG_CODE);
		boxes[7].focus();

		fireEvent.keyDown(boxes[7], { key: 'Backspace' });
		expect(typed.code).toBe(WRONG_CODE.slice(0, 7));

		fireEvent.keyDown(boxes[7], { key: 'Backspace' });
		expect(document.activeElement).toBe(boxes[6]);
		expect(typed.code).toBe(WRONG_CODE.slice(0, 6));
	});

	it('leaves a shortcut on the same letter to the browser', () => {
		const { boxes } = renderCodeBoxes();
		typeCodeFromFirstBox(boxes, WRONG_CODE);
		boxes[0].focus();

		const wasLeftAlone = fireEvent.keyDown(boxes[0], { key: 'a', ctrlKey: true });

		expect(wasLeftAlone).toBe(true);
		expect(document.activeElement).toBe(boxes[0]);
	});
});
