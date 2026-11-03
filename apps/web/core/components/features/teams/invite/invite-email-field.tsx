'use client';

import { type ClipboardEvent, type KeyboardEvent, type ReactNode, useCallback, useId, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Alert, Clock, UserCheck, X } from '@/core/components/icons';
import { controlGroupRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import type { InviteEmailEntry, InviteEmailState } from '@/core/lib/utils/invite-emails';

interface ChipLook {
	toneClass: string;
	icon: ReactNode;
	hintKey: DottedLanguageObjectStringPaths | null;
}

const CHIP_LOOK: Record<InviteEmailState, ChipLook> = {
	new: { toneClass: 'bg-foreground/5 text-foreground', icon: null, hintKey: null },
	pending: {
		toneClass: 'bg-warning/10 text-warning-foreground',
		icon: <Clock />,
		hintKey: 'modals.invite.chips.PENDING'
	},
	member: {
		toneClass: 'bg-foreground/5 text-muted-foreground',
		icon: <UserCheck />,
		hintKey: 'modals.invite.chips.MEMBER'
	},
	invalid: {
		toneClass: 'bg-destructive/10 text-destructive-ink',
		icon: <Alert />,
		hintKey: 'modals.invite.chips.INVALID'
	}
};

/** Keys that turn what is typed into an address chip. */
const COMMIT_KEYS = new Set(['Enter', ',', ';', ' ', 'Tab']);

type Translate = ReturnType<typeof useTranslations>;

function hintOf(look: ChipLook, t: Translate): string | undefined {
	if (!look.hintKey) {
		return undefined;
	}

	return t(look.hintKey);
}

function placeholderOf(hasEntries: boolean, t: Translate): string {
	if (hasEntries) {
		return t('modals.invite.ADD_MORE_PLACEHOLDER');
	}

	return t('modals.invite.EMAILS_PLACEHOLDER');
}

function EmailChip({ entry, onRemove }: Readonly<{ entry: InviteEmailEntry; onRemove: (email: string) => void }>) {
	const t = useTranslations();
	const look = CHIP_LOOK[entry.state];
	const hint = hintOf(look, t);

	return (
		<li
			title={hint}
			className={cn(
				'inline-flex h-6 max-w-full items-center gap-1 rounded-md pl-2 pr-0.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0',
				look.toneClass
			)}
		>
			{look.icon}
			<span className="truncate">{entry.email}</span>
			{hint && <span className="sr-only">{hint}</span>}
			<button
				type="button"
				onClick={() => onRemove(entry.email)}
				aria-label={t('modals.invite.chips.REMOVE', { email: entry.email })}
				className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] opacity-60 outline-none transition-[opacity,background-color] hover:bg-foreground/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<X />
			</button>
		</li>
	);
}

interface InviteEmailFieldProps {
	entries: InviteEmailEntry[];
	onAdd: (text: string) => void;
	onRemove: (email: string) => void;
	onRemoveLast: () => void;
	isFull: boolean;
	/** Enter on an empty line, or ⌘↵ at any time, sends; the address being typed is committed first. */
	onSubmitShortcut: () => void;
	/** Sits at the right end of the field, the role picker of admins. */
	trailing?: ReactNode;
	describedBy?: string;
}

/**
 * One field for many addresses, the "To" of a mail composer: one line high, each address becomes a chip tinted by
 * what will happen to it (invited, sent again, already in the team, not an address), a pasted list fills it at once,
 * Backspace on an empty line removes the last chip. Past three lines of chips the field scrolls inside itself.
 */
export function InviteEmailField({
	entries,
	onAdd,
	onRemove,
	onRemoveLast,
	isFull,
	onSubmitShortcut,
	trailing,
	describedBy
}: Readonly<InviteEmailFieldProps>) {
	const t = useTranslations();
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useState('');
	const hasEntries = entries.length > 0;

	const commitDraft = useCallback(() => {
		const typed = draft.trim();
		if (typed.length === 0) {
			return false;
		}
		onAdd(typed);
		setDraft('');
		return true;
	}, [draft, onAdd]);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		const isEnter = event.key === 'Enter';
		const withModifier = event.metaKey || event.ctrlKey;
		const isSubmitShortcut = isEnter && withModifier;
		const isDraftEmpty = draft.trim().length === 0;
		const sendsFromEmptyLine = isEnter && isDraftEmpty;
		if (isSubmitShortcut || sendsFromEmptyLine) {
			event.preventDefault();
			commitDraft();
			onSubmitShortcut();
			return;
		}
		if (COMMIT_KEYS.has(event.key)) {
			const committed = commitDraft();
			const keepsTabNavigation = event.key === 'Tab' && !committed;
			if (!keepsTabNavigation) {
				event.preventDefault();
			}
			return;
		}
		const removesLastChip = event.key === 'Backspace' && draft.length === 0;
		if (removesLastChip) {
			onRemoveLast();
		}
	};

	const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
		const pasted = event.clipboardData.getData('text');
		event.preventDefault();
		onAdd(`${draft} ${pasted}`);
		setDraft('');
	};

	const focusInput = () => {
		inputRef.current?.focus();
	};

	return (
		<div
			onClick={focusInput}
			className={cn(controlGroupRecipe, 'min-h-9 cursor-text items-start gap-1 py-1 pl-1 pr-1')}
		>
			<div className="flex max-h-[5.25rem] min-w-0 flex-1 flex-wrap items-center gap-1 overflow-y-auto overscroll-contain">
				{hasEntries && (
					<ul aria-label={t('modals.invite.chips.LIST_LABEL')} className="contents">
						{entries.map((entry) => (
							<EmailChip key={entry.email} entry={entry} onRemove={onRemove} />
						))}
					</ul>
				)}
				<label htmlFor={inputId} className="sr-only">
					{t('modals.invite.EMAILS_LABEL')}
				</label>
				<input
					ref={inputRef}
					id={inputId}
					type="text"
					inputMode="email"
					autoComplete="off"
					spellCheck={false}
					data-initial-focus=""
					value={draft}
					disabled={isFull}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					onBlur={commitDraft}
					aria-describedby={describedBy}
					placeholder={placeholderOf(hasEntries, t)}
					className="h-7 min-w-36 flex-1 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 disabled:cursor-not-allowed"
				/>
			</div>
			{trailing && <div className="flex h-7 shrink-0 items-center">{trailing}</div>}
		</div>
	);
}
