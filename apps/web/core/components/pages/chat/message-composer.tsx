'use client';

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, mentionQueryAt, suggestMentions } from '@/core/lib/utils/chat-format';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/core/types/interfaces/common/chat';

/** The `@` suggestions: the members, plus everyone. */
const EVERYONE: ChatPerson[] = [
	{ employeeId: '!channel', name: 'channel' },
	{ employeeId: '!here', name: 'here' }
];

export interface MessageComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (body: string) => Promise<void> | void;
	onCancel?: () => void;
	people: readonly ChatPerson[];
	placeholder: string;
	disabled?: boolean;
	autoFocus?: boolean;
	/** Edit mode: the submit label changes and Escape cancels. */
	editing?: boolean;
	/** A thread composer offers "also send to the conversation". */
	alsoToConversation?: { checked: boolean; onChange: (checked: boolean) => void };
	className?: string;
}

/**
 * The composer: `Enter` sends, `Shift+Enter` breaks the line, `Escape` cancels an edit; `@` opens the member
 * suggestions (arrows to move, `Enter` / `Tab` to pick), which insert a rename-safe mention token.
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
	const textarea = useRef<HTMLTextAreaElement | null>(null);
	const [caret, setCaret] = useState(0);
	const [selected, setSelected] = useState(0);
	const [sending, setSending] = useState(false);

	const mention = useMemo(() => mentionQueryAt(value, caret), [caret, value]);
	const suggestions = useMemo(() => {
		if (!mention) return [];
		const everyone = EVERYONE.filter((entry) => !mention.query || entry.name.startsWith(mention.query.toLowerCase()));
		return [...suggestMentions(people, mention.query, 6), ...everyone];
	}, [mention, people]);

	useEffect(() => setSelected(0), [mention?.query]);

	// The textarea grows with its content, up to a few lines.
	useEffect(() => {
		const element = textarea.current;
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
	}, [value]);

	const insertMention = useCallback(
		(person: ChatPerson) => {
			if (!mention) return;
			const token = person.employeeId.startsWith('!') ? `<${person.employeeId}>` : `<@${person.employeeId}>`;
			const next = `${value.slice(0, mention.start)}${token} ${value.slice(caret)}`;
			onChange(next);
			const position = mention.start + token.length + 1;
			requestAnimationFrame(() => {
				textarea.current?.setSelectionRange(position, position);
				setCaret(position);
				textarea.current?.focus();
			});
		},
		[caret, mention, onChange, value]
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
			if (event.key === 'Enter' || event.key === 'Tab') {
				event.preventDefault();
				insertMention(suggestions[selected] ?? suggestions[0]);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				onChange(value);
				setCaret(-1);
				return;
			}
		}
		if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			void submit();
			return;
		}
		if (event.key === 'Escape' && editing && onCancel) {
			event.preventDefault();
			onCancel();
		}
	};

	const tooLong = value.length > CHAT_MESSAGE_MAX_LENGTH;

	return (
		<div className={cn('relative flex flex-col gap-1', className)}>
			{suggestions.length > 0 && mention && (
				<ul role="listbox" className="absolute bottom-full left-0 z-20 mb-1 max-h-60 w-72 overflow-y-auto rounded-md border border-border bg-background p-1 shadow-md">
					{suggestions.map((person, index) => (
						<li key={person.employeeId}>
							<button
								type="button"
								role="option"
								aria-selected={index === selected}
								onMouseDown={(event) => {
									event.preventDefault();
									insertMention(person);
								}}
								className={cn('flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left text-[13px]', index === selected && 'bg-foreground/[0.06]')}
							>
								{person.employeeId.startsWith('!') ? (
									<span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-[11px]">@</span>
								) : (
									<PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} size="sm" className="size-5" />
								)}
								<span className="truncate">{person.employeeId.startsWith('!') ? `@${person.name}` : person.name}</span>
								{person.employeeId.startsWith('!') && <span className="ml-auto text-[11px] text-muted-foreground">{t('teamChat.EVERYONE')}</span>}
							</button>
						</li>
					))}
				</ul>
			)}
			<div className={cn('flex items-end gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-[3px] focus-within:ring-ring/25', tooLong && 'border-destructive')}>
				<textarea
					ref={textarea}
					value={value}
					onChange={(event) => {
						onChange(event.target.value);
						setCaret(event.target.selectionStart ?? event.target.value.length);
					}}
					onSelect={(event) => setCaret((event.target as HTMLTextAreaElement).selectionStart ?? 0)}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					aria-label={placeholder}
					rows={1}
					disabled={disabled}
					autoFocus={autoFocus}
					className="max-h-50 min-h-6 flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
				/>
				<Button size="icon-sm" variant={value.trim() ? 'default' : 'ghost'} onClick={() => void submit()} disabled={disabled || sending || !value.trim() || tooLong} aria-label={editing ? t('teamChat.SAVE') : t('teamChat.SEND')} title={editing ? t('teamChat.SAVE') : t('teamChat.SEND')}>
					<Send className="size-4" />
				</Button>
			</div>
			<div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
				{alsoToConversation && (
					<label className="inline-flex cursor-pointer items-center gap-1.5">
						<input type="checkbox" checked={alsoToConversation.checked} onChange={(event) => alsoToConversation.onChange(event.target.checked)} className="size-3.5" />
						{t('teamChat.ALSO_SEND_TO_CONVERSATION')}
					</label>
				)}
				{editing && onCancel && (
					<button type="button" onClick={onCancel} className="cursor-pointer hover:underline">
						{t('teamChat.CANCEL_EDIT')}
					</button>
				)}
				<span className="ml-auto">{tooLong ? t('teamChat.TOO_LONG', { max: CHAT_MESSAGE_MAX_LENGTH }) : t('teamChat.COMPOSER_HINT')}</span>
			</div>
		</div>
	);
}
