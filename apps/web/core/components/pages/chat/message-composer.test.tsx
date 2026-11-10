/** @jest-environment jsdom */

import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/core/types/interfaces/common/chat';
import { MessageComposer, MessageComposerProps } from './message-composer';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The picker is fetched on demand; what the composer does with a picked emoji is what is tested here.
jest.mock('./emoji-popover', () => ({
	EmojiPopover: ({ label, onPick }: { label: string; onPick: (emoji: string) => void }) => <button type="button" aria-label={label} onClick={() => onPick('🎉')} />
}));

const ANA = '11111111-1111-4111-8111-111111111111';
const BO = '22222222-2222-4222-8222-222222222222';
const PEOPLE: ChatPerson[] = [
	{ employeeId: ANA, name: 'Ana Silva' },
	{ employeeId: BO, name: 'Bo Chen' }
];

function Harness({ initial = '', ...props }: Partial<MessageComposerProps> & { initial?: string }) {
	const [value, setValue] = useState(initial);
	return <MessageComposer value={value} onChange={setValue} onSubmit={jest.fn()} people={PEOPLE} placeholder="Message general" {...props} />;
}

const field = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const button = (name: RegExp) => screen.getByRole('button', { name });
const sendButton = () => button(/^teamChat\.SEND$/) as HTMLButtonElement;

function focusField() {
	act(() => field().focus());
}

function select(start: number, end: number = start) {
	const element = field();
	focusField();
	element.setSelectionRange(start, end);
	fireEvent.select(element);
}

async function press(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) {
	await act(async () => {
		fireEvent.keyDown(field(), { key, ...modifiers });
	});
}

function selection(): [number, number] {
	return [field().selectionStart, field().selectionEnd];
}

afterEach(() => {
	// Only the test of the typed path defines it: this DOM has no `execCommand` of its own.
	delete (document as { execCommand?: unknown }).execCommand;
});

describe('sending', () => {
	it('sends the trimmed text on Enter and keeps Shift+Enter for a new line', async () => {
		const onSubmit = jest.fn();
		render(<Harness initial="  hello  " onSubmit={onSubmit} />);
		await press('Enter', { shiftKey: true });
		expect(onSubmit).not.toHaveBeenCalled();
		await press('Enter');
		expect(onSubmit).toHaveBeenCalledWith('hello');
	});

	it('sends with the button, which is disabled while there is nothing to send', async () => {
		const onSubmit = jest.fn();
		const { rerender } = render(<Harness key="empty" initial="   " onSubmit={onSubmit} />);
		expect(sendButton().disabled).toBe(true);
		rerender(<Harness key="text" initial="hi" onSubmit={onSubmit} />);
		await act(async () => {
			fireEvent.click(button(/^teamChat\.SEND$/));
		});
		expect(onSubmit).toHaveBeenCalledWith('hi');
	});

	it('shows the counter only near the limit, and refuses a message over it', async () => {
		const onSubmit = jest.fn();
		const { rerender } = render(<Harness key="short" initial="hello" onSubmit={onSubmit} />);
		expect(screen.queryByText(String(CHAT_MESSAGE_MAX_LENGTH - 5))).toBeNull();
		rerender(<Harness key="near" initial={'a'.repeat(CHAT_MESSAGE_MAX_LENGTH - 150)} onSubmit={onSubmit} />);
		expect(screen.getByText('150')).toBeTruthy();
		rerender(<Harness key="over" initial={'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 3)} onSubmit={onSubmit} />);
		expect(screen.getByText('-3')).toBeTruthy();
		expect(screen.getByText('teamChat.TOO_LONG')).toBeTruthy();
		expect(sendButton().disabled).toBe(true);
		await press('Enter');
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('formatting', () => {
	it('makes the selection bold with Ctrl+B, keeps it selected, and takes the bold off again', async () => {
		render(<Harness initial="say hello now" />);
		select(4, 9);
		await press('b', { ctrlKey: true });
		expect(field().value).toBe('say **hello** now');
		expect(selection()).toEqual([6, 11]);
		await press('b', { ctrlKey: true });
		expect(field().value).toBe('say hello now');
		expect(selection()).toEqual([4, 9]);
	});

	it('takes Cmd+I for italic and Ctrl+E for code', async () => {
		render(<Harness initial="hello" />);
		select(0, 5);
		await press('i', { metaKey: true });
		expect(field().value).toBe('_hello_');
		await press('e', { ctrlKey: true });
		expect(field().value).toBe('_`hello`_');
	});

	it('leaves the browser its own shortcuts', async () => {
		render(<Harness initial="hello" />);
		select(0, 5);
		await press('b', { ctrlKey: true, shiftKey: true });
		await press('k', { ctrlKey: true });
		expect(field().value).toBe('hello');
	});

	it('formats from the toolbar: bold, italic, code, code block, list, link', () => {
		const { rerender } = render(<Harness key="bold" initial="word" />);
		const run = (name: RegExp, start: number, end: number) => {
			select(start, end);
			fireEvent.click(button(name));
			return field().value;
		};
		expect(run(/FORMAT_BOLD/, 0, 4)).toBe('**word**');
		rerender(<Harness key="italic" initial="word" />);
		expect(run(/FORMAT_ITALIC/, 0, 4)).toBe('_word_');
		rerender(<Harness key="code" initial="word" />);
		expect(run(/FORMAT_CODE \(/, 0, 4)).toBe('`word`');
		rerender(<Harness key="block" initial="word" />);
		expect(run(/FORMAT_CODE_BLOCK/, 0, 4)).toBe('```\nword\n```');
		rerender(<Harness key="list" initial={'one\ntwo'} />);
		expect(run(/FORMAT_LIST/, 0, 7)).toBe('- one\n- two');
		rerender(<Harness key="link" initial="docs" />);
		expect(run(/FORMAT_LINK/, 0, 4)).toBe('[docs]()');
		// The caret waits between the parentheses, for the address.
		expect(selection()).toEqual([7, 7]);
	});

	it('names the shortcut on the buttons that have one', () => {
		render(<Harness />);
		expect(button(/FORMAT_BOLD/).getAttribute('title')).toMatch(/^teamChat\.FORMAT_BOLD \((Ctrl\+|⌘)B\)$/);
		expect(button(/FORMAT_LIST/).getAttribute('title')).toBe('teamChat.FORMAT_LIST');
	});

	it('inserts a picked emoji at the caret', () => {
		render(<Harness initial="hi there" />);
		select(2);
		fireEvent.click(button(/ADD_EMOJI/));
		expect(field().value).toBe('hi🎉 there');
		expect(selection()).toEqual([4, 4]);
	});

	it('hands the edit to the browser as typing where it can, so its undo keeps the edit', () => {
		// What a browser does for `insertText`: the selection is replaced and an input event tells the page.
		const execCommand = jest.fn((command: string, _showUi?: boolean, text?: string) => {
			const element = document.activeElement as HTMLTextAreaElement;
			const { selectionStart, selectionEnd, value } = element;
			const typed = command === 'delete' ? '' : (text ?? '');
			const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setValue?.call(element, value.slice(0, selectionStart) + typed + value.slice(selectionEnd));
			element.setSelectionRange(selectionStart + typed.length, selectionStart + typed.length);
			element.dispatchEvent(new Event('input', { bubbles: true }));
			return true;
		});
		(document as { execCommand?: unknown }).execCommand = execCommand;
		render(<Harness initial="say hello now" />);
		select(4, 9);
		fireEvent.click(button(/FORMAT_BOLD/));
		// Only the changed stretch is typed, over the selection it replaces.
		expect(execCommand).toHaveBeenCalledWith('insertText', false, '**hello**');
		expect(field().value).toBe('say **hello** now');
		expect(selection()).toEqual([6, 11]);
		fireEvent.click(button(/FORMAT_BOLD/));
		expect(execCommand).toHaveBeenLastCalledWith('insertText', false, 'hello');
		expect(field().value).toBe('say hello now');
	});
});

describe('mentions', () => {
	/** The names the suggestions show (each also carries an avatar, or the @ mark of "everyone"). */
	const options = () => screen.queryAllByRole('option').map((option) => option.querySelector('.truncate')?.textContent);

	it('opens the suggestions from the @ button and inserts the picked person as a token', async () => {
		render(<Harness initial="hi" />);
		select(2);
		fireEvent.click(button(/MENTION_SOMEONE/));
		expect(field().value).toBe('hi @');
		expect(options()).toEqual(['Ana Silva', 'Bo Chen', '@channel', '@here']);
		await press('ArrowDown');
		expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
		await press('Enter');
		expect(field().value).toBe(`hi <@${BO}> `);
		expect(options()).toEqual([]);
	});

	it('filters as the name is typed and picks with Tab', async () => {
		render(<Harness />);
		focusField();
		fireEvent.change(field(), { target: { value: '@an' } });
		expect(options()).toEqual(['Ana Silva']);
		await press('Tab');
		expect(field().value).toBe(`<@${ANA}> `);
	});

	it('closes the suggestions on Escape without sending or clearing, until another mention starts', async () => {
		const onSubmit = jest.fn();
		render(<Harness onSubmit={onSubmit} />);
		focusField();
		fireEvent.change(field(), { target: { value: '@a' } });
		expect(options().length).toBeGreaterThan(0);
		await press('Escape');
		expect(options()).toEqual([]);
		expect(field().value).toBe('@a');
		// Still the same mention: it stays closed, and Enter sends.
		fireEvent.change(field(), { target: { value: '@an' } });
		expect(options()).toEqual([]);
		// A new one opens them again.
		fireEvent.change(field(), { target: { value: '@an @b' } });
		expect(options()).toEqual(['Bo Chen']);
	});

	it('wraps around with the arrows', async () => {
		render(<Harness />);
		focusField();
		fireEvent.change(field(), { target: { value: '@' } });
		await press('ArrowUp');
		const all = screen.getAllByRole('option');
		expect(all[all.length - 1].getAttribute('aria-selected')).toBe('true');
	});
});

describe('editing', () => {
	it('offers Save and Cancel, saves on Enter and cancels on Escape', async () => {
		const onSubmit = jest.fn();
		const onCancel = jest.fn();
		render(<Harness initial="fixed text" editing onSubmit={onSubmit} onCancel={onCancel} />);
		expect(screen.queryByRole('button', { name: /^teamChat\.SEND$/ })).toBeNull();
		expect(screen.getByText('teamChat.EDIT_HINT')).toBeTruthy();
		await press('Enter');
		expect(onSubmit).toHaveBeenCalledWith('fixed text');
		await press('Escape');
		expect(onCancel).toHaveBeenCalledTimes(1);
		fireEvent.click(button(/^teamChat\.CANCEL$/));
		expect(onCancel).toHaveBeenCalledTimes(2);
		await act(async () => {
			fireEvent.click(button(/^teamChat\.SAVE$/));
		});
		expect(onSubmit).toHaveBeenCalledTimes(2);
	});

	it('leaves Shift+Escape to the page', async () => {
		const onCancel = jest.fn();
		render(<Harness initial="text" editing onCancel={onCancel} />);
		await press('Escape', { shiftKey: true });
		expect(onCancel).not.toHaveBeenCalled();
	});
});

describe('a thread composer', () => {
	it('offers to send the reply to the conversation too', () => {
		const onChange = jest.fn();
		render(<Harness alsoToConversation={{ checked: false, onChange }} />);
		fireEvent.click(screen.getByRole('checkbox', { name: 'teamChat.ALSO_SEND_TO_CONVERSATION' }));
		expect(onChange).toHaveBeenCalledWith(true);
	});
});
