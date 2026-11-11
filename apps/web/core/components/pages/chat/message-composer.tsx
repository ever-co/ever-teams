'use client';

import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AtSign, Bold, CodeBlock, InlineCode, Italic, Link, ListBullet, Send, Smile } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { MENU_SURFACE } from '@/core/components/common/menu-recipes';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ComposeEdit, insertAt, insertLink, insertMentionTrigger, ITALIC, replacementOf, toggleCodeBlock, toggleLinePrefix, toggleWrap } from '@/core/lib/utils/chat-compose';
import { ChatPerson, mentionQueryAt, suggestMentions } from '@/core/lib/utils/chat-format';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/core/types/interfaces/common/chat';
import { EmojiPopover } from './emoji-popover';

/** The `@` suggestions: the members, plus everyone. */
const EVERYONE: ChatPerson[] = [
	{ employeeId: '!channel', name: 'channel' },
	{ employeeId: '!here', name: 'here' }
];

/** The counter shows once this few characters are left (and while the message is too long). */
const COUNTER_FROM = 200;

/** `Ctrl/Cmd` + these keys wrap the selection in the marker. */
const WRAP_SHORTCUTS: Record<string, string> = { b: '**', i: ITALIC, e: '`' };

const TOOL_BUTTON =
	'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:bg-foreground/5 data-[popup-open]:text-foreground [&_svg]:size-4';

export interface MessageComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (body: string) => Promise<void> | void;
	onCancel?: () => void;
	people: readonly ChatPerson[];
	placeholder: string;
	disabled?: boolean;
	autoFocus?: boolean;
	/** Edit mode: Save and Cancel replace Send, and Escape cancels. */
	editing?: boolean;
	/** A thread composer offers "also send to the conversation". */
	alsoToConversation?: { checked: boolean; onChange: (checked: boolean) => void };
	className?: string;
}

/**
 * Replaces a stretch of the field the way typing would, so the browser's own undo (Ctrl+Z) takes a formatting edit
 * back like any other. Answers whether the browser did it; where it cannot, the caller sets the text itself.
 */
function typeInto(element: HTMLTextAreaElement, start: number, end: number, text: string): boolean {
	if (typeof document.execCommand !== 'function') return false;
	element.setSelectionRange(start, end);
	try {
		if (text) return document.execCommand('insertText', false, text);
		return start === end || document.execCommand('delete', false);
	} catch {
		return false;
	}
}

/** A button of the formatting row. It never takes the focus: the edit applies to what is selected in the field. */
function ToolButton({ label, onClick, disabled, className, children }: Readonly<{ label: string; onClick: () => void; disabled?: boolean; className?: string; children: ReactNode }>) {
	return (
		<button type="button" aria-label={label} title={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={cn(TOOL_BUTTON, className)}>
			{children}
		</button>
	);
}

/**
 * The composer: a box with the text on top and a row of tools under it (formatting, emoji, mention, send).
 * `Enter` sends, `Shift+Enter` breaks the line, `Escape` cancels an edit; `Ctrl/Cmd+B`, `I` and `E` make the selection
 * bold, italic or code; `@` opens the member suggestions (arrows to move, `Enter` / `Tab` to pick, `Escape` to close),
 * which insert a rename-safe mention token.
 */
export function MessageComposer({
	value,
	onChange,
	onSubmit,
	onCancel,
	people,
	placeholder,
	disabled,
	autoFocus,
	editing,
	alsoToConversation,
	className
}: Readonly<MessageComposerProps>) {
	const t = useTranslations();
	const listId = useId();
	const textarea = useRef<HTMLTextAreaElement | null>(null);
	// Where an edit wants the selection, applied once the field holds the edited text.
	const pendingSelection = useRef<{ start: number; end: number } | null>(null);
	const [caret, setCaret] = useState(0);
	const [selected, setSelected] = useState(0);
	const [sending, setSending] = useState(false);
	const [focused, setFocused] = useState(false);
	// The `@` whose suggestions were closed with Escape: they stay closed while the caret is in that mention.
	const [dismissedAt, setDismissedAt] = useState<number | null>(null);
	// Read once on this device: the composer renders with the conversation, which the server never has.
	const [modifier] = useState(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+'));

	const mention = useMemo(() => mentionQueryAt(value, caret), [caret, value]);
	const suggestions = useMemo(() => {
		if (!mention || !focused || mention.start === dismissedAt) return [];
		const everyone = EVERYONE.filter((entry) => !mention.query || entry.name.startsWith(mention.query.toLowerCase()));
		return [...suggestMentions(people, mention.query, 6), ...everyone];
	}, [dismissedAt, focused, mention, people]);

	useEffect(() => setSelected(0), [mention?.query]);

	// The textarea grows with its content, up to a few lines.
	useEffect(() => {
		const element = textarea.current;
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
	}, [value]);

	// An edit that set the text through `onChange` (not as typing): the field has just been given the new text, which
	// moved its caret to the end.
	useLayoutEffect(() => {
		const selection = pendingSelection.current;
		const element = textarea.current;
		if (!selection || !element) return;
		pendingSelection.current = null;
		element.setSelectionRange(selection.start, selection.end);
	}, [value]);

	/** Puts an edit (formatting, an emoji, a mention) into the field and the selection where the edit wants it. */
	const applyEdit = useCallback(
		(edit: ComposeEdit) => {
			const element = textarea.current;
			if (!element) {
				onChange(edit.value);
				return;
			}
			element.focus();
			setFocused(true);
			if (edit.value !== element.value) {
				const change = replacementOf(element.value, edit.value);
				pendingSelection.current = { start: edit.selectionStart, end: edit.selectionEnd };
				if (!typeInto(element, change.start, change.end, change.text) || element.value !== edit.value) onChange(edit.value);
			}
			element.setSelectionRange(edit.selectionStart, edit.selectionEnd);
			setCaret(edit.selectionEnd);
		},
		[onChange]
	);

	/** Runs a formatting edit on what is selected in the field. */
	const format = useCallback(
		(edit: (text: string, selectionStart: number, selectionEnd: number) => ComposeEdit) => {
			const element = textarea.current;
			if (!element || disabled) return;
			applyEdit(edit(element.value, element.selectionStart ?? element.value.length, element.selectionEnd ?? element.value.length));
		},
		[applyEdit, disabled]
	);

	const insertMention = useCallback(
		(person: ChatPerson) => {
			if (!mention) return;
			const token = person.employeeId.startsWith('!') ? `<${person.employeeId}>` : `<@${person.employeeId}>`;
			const position = mention.start + token.length + 1;
			applyEdit({ value: `${value.slice(0, mention.start)}${token} ${value.slice(caret)}`, selectionStart: position, selectionEnd: position });
		},
		[applyEdit, caret, mention, value]
	);

	const submit = useCallback(async () => {
		const body = value.trim();
		if (!body || sending || disabled) return;
		if (body.length > CHAT_MESSAGE_MAX_LENGTH) return;
		setSending(true);
		try {
			await onSubmit(body);
		} finally {
			setSending(false);
			requestAnimationFrame(() => textarea.current?.focus());
		}
	}, [disabled, onSubmit, sending, value]);

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (suggestions.length && mention) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setSelected((index) => (index + 1) % suggestions.length);
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				setSelected((index) => (index - 1 + suggestions.length) % suggestions.length);
				return;
			}
			if ((event.key === 'Enter' || event.key === 'Tab') && !event.nativeEvent.isComposing) {
				event.preventDefault();
				insertMention(suggestions[selected] ?? suggestions[0]);
				return;
			}
			if (event.key === 'Escape' && !event.shiftKey) {
				event.preventDefault();
				setDismissedAt(mention.start);
				return;
			}
		}
		if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
			const marker = WRAP_SHORTCUTS[event.key.toLowerCase()];
			if (marker) {
				event.preventDefault();
				format((text, start, end) => toggleWrap(text, start, end, marker));
				return;
			}
		}
		if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			void submit();
			return;
		}
		if (event.key === 'Escape' && !event.shiftKey && editing && onCancel) {
			event.preventDefault();
			onCancel();
		}
	};

	const remaining = CHAT_MESSAGE_MAX_LENGTH - value.length;
	const tooLong = remaining < 0;
	const hasText = value.trim().length > 0;
	const cannotSend = disabled || sending || !hasText || tooLong;
	const showsSuggestions = suggestions.length > 0 && !!mention;
	let hint = t('teamChat.COMPOSER_HINT');
	if (editing) hint = t('teamChat.EDIT_HINT');
	if (tooLong) hint = t('teamChat.TOO_LONG', { max: CHAT_MESSAGE_MAX_LENGTH });

	return (
		<div className={cn('relative flex flex-col gap-1', className)}>
			{showsSuggestions && (
				<div id={listId} role="listbox" aria-label={t('teamChat.MENTION_SOMEONE')} className={cn(MENU_SURFACE, 'absolute bottom-full start-0 z-20 mb-1.5 max-h-60 w-72 max-w-full overflow-y-auto')}>
					{suggestions.map((person, index) => {
						const isEveryone = person.employeeId.startsWith('!');
						return (
							<div
								key={person.employeeId}
								id={`${listId}-${index}`}
								role="option"
								tabIndex={-1}
								aria-selected={index === selected}
								onMouseDown={(event) => {
									event.preventDefault();
									insertMention(person);
								}}
								onMouseEnter={() => setSelected(index)}
								className={cn('flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] text-foreground', index === selected && 'bg-foreground/5')}
							>
								{isEveryone ? (
									<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-medium text-amber-700 dark:text-amber-300">@</span>
								) : (
									<PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className="size-5 text-[9px] ring-0" />
								)}
								<span className="min-w-0 flex-1 truncate">{isEveryone ? `@${person.name}` : person.name}</span>
								{isEveryone && <span className="shrink-0 text-[11px] text-muted-foreground">{t('teamChat.EVERYONE')}</span>}
							</div>
						);
					})}
				</div>
			)}
			<div
				className={cn(
					'rounded-xl bg-card shadow-xs shadow-black/5 hairline-border border-transparent hairline-ring ring-border transition-[box-shadow,border-color] focus-within:border-foreground/30 focus-within:ring-[3px] focus-within:ring-ring/25',
					tooLong && 'border-destructive ring-destructive/25 focus-within:border-destructive focus-within:ring-destructive/25',
					disabled && 'opacity-60'
				)}
			>
				<textarea
					ref={textarea}
					value={value}
					onChange={(event) => {
						const position = event.target.selectionStart ?? event.target.value.length;
						onChange(event.target.value);
						setCaret(position);
						// Typing means the field has the focus, however it got it (a field focused as it mounts tells nobody).
						setFocused(true);
						// Closed suggestions open again with the next mention.
						if (dismissedAt !== null && mentionQueryAt(event.target.value, position)?.start !== dismissedAt) setDismissedAt(null);
					}}
					onSelect={(event) => setCaret((event.target as HTMLTextAreaElement).selectionStart ?? 0)}
					onKeyDown={onKeyDown}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					placeholder={placeholder}
					aria-label={placeholder}
					aria-autocomplete="list"
					aria-controls={showsSuggestions ? listId : undefined}
					aria-activedescendant={showsSuggestions ? `${listId}-${selected}` : undefined}
					rows={1}
					disabled={disabled}
					autoFocus={autoFocus}
					className="block max-h-50 min-h-6 w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
				/>
				{/* The row wraps: in a narrow pane (a thread) the actions of an edit go under the tools, never over them. */}
				<div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-1.5 pb-1.5">
					<div role="toolbar" aria-label={t('teamChat.FORMATTING')} className="flex min-w-0 flex-wrap items-center gap-0.5">
						<ToolButton label={`${t('teamChat.FORMAT_BOLD')} (${modifier}B)`} disabled={disabled} onClick={() => format((text, start, end) => toggleWrap(text, start, end, '**'))}>
							<Bold />
						</ToolButton>
						<ToolButton label={`${t('teamChat.FORMAT_ITALIC')} (${modifier}I)`} disabled={disabled} onClick={() => format((text, start, end) => toggleWrap(text, start, end, ITALIC))}>
							<Italic />
						</ToolButton>
						<ToolButton label={`${t('teamChat.FORMAT_CODE')} (${modifier}E)`} disabled={disabled} onClick={() => format((text, start, end) => toggleWrap(text, start, end, '`'))}>
							<InlineCode />
						</ToolButton>
						<ToolButton label={t('teamChat.FORMAT_CODE_BLOCK')} disabled={disabled} onClick={() => format(toggleCodeBlock)} className="max-[360px]:hidden">
							<CodeBlock />
						</ToolButton>
						<ToolButton label={t('teamChat.FORMAT_LIST')} disabled={disabled} onClick={() => format((text, start, end) => toggleLinePrefix(text, start, end, '- '))}>
							<ListBullet />
						</ToolButton>
						<ToolButton label={t('teamChat.FORMAT_LINK')} disabled={disabled} onClick={() => format(insertLink)} className="max-[360px]:hidden">
							<Link />
						</ToolButton>
						<span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
						<EmojiPopover label={t('teamChat.ADD_EMOJI')} className={TOOL_BUTTON} finalFocus={textarea} onPick={(emoji) => format((text, start, end) => insertAt(text, start, end, emoji))}>
							<Smile />
						</EmojiPopover>
						<ToolButton label={t('teamChat.MENTION_SOMEONE')} disabled={disabled} onClick={() => format(insertMentionTrigger)}>
							<AtSign />
						</ToolButton>
					</div>
					<div className="ms-auto flex shrink-0 items-center gap-1.5 ps-2">
						{remaining <= COUNTER_FROM && (
							<span aria-live="polite" className={cn('px-1 text-[11px] tabular-nums', tooLong ? 'font-medium text-destructive' : 'text-muted-foreground')}>
								{remaining}
							</span>
						)}
						{editing && onCancel && (
							<Button type="button" variant="ghost" size="sm" onClick={onCancel} title={t('teamChat.CANCEL_EDIT')}>
								{t('teamChat.CANCEL')}
							</Button>
						)}
						{editing ? (
							<Button type="button" size="sm" onClick={() => void submit()} disabled={cannotSend}>
								{t('teamChat.SAVE')}
							</Button>
						) : (
							<Button type="button" size="icon-sm" variant={hasText ? 'default' : 'ghost'} onClick={() => void submit()} disabled={cannotSend} aria-label={t('teamChat.SEND')} title={t('teamChat.SEND')}>
								<Send className="size-4 rtl:-scale-x-100" />
							</Button>
						)}
					</div>
				</div>
			</div>
			<div className="flex min-h-4 items-center gap-3 px-1 text-[11px] text-muted-foreground/80">
				{alsoToConversation && (
					<label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
						<input type="checkbox" checked={alsoToConversation.checked} onChange={(event) => alsoToConversation.onChange(event.target.checked)} className="size-3.5 accent-primary" />
						{t('teamChat.ALSO_SEND_TO_CONVERSATION')}
					</label>
				)}
				<span className={cn('ms-auto text-end', tooLong ? 'text-destructive' : 'hidden sm:inline')}>{hint}</span>
			</div>
		</div>
	);
}
