'use client';

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { controlGroupRecipe } from '@/core/components/common/input';
import { commandKeycapClass } from '@/core/components/common/command';
import { Search, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const SEARCH_DEBOUNCE_MS = 200;

/** The key that jumps into the search from anywhere outside a field; the shortcuts sheet lists it. */
export const TASK_SEARCH_FOCUS_KEY = '/';

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
	return isField || target.isContentEditable;
}

/**
 * The search of a task list: typed text reaches the list after a short pause, so a long list is not filtered
 * again on every key. With `focusKey`, "/" anywhere outside a field jumps into it, and Escape leaves it.
 */
export function TaskSearchField({
	value,
	onChange,
	placeholder,
	focusKey = false,
	className
}: Readonly<{
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	focusKey?: boolean;
	className?: string;
}>) {
	const t = useTranslations();
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	useEffect(() => {
		const isPending = draft !== value;
		if (!isPending) {
			return;
		}
		const timeout = window.setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timeout);
	}, [draft, onChange, value]);

	useEffect(() => {
		if (!focusKey) {
			return;
		}
		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			const isFocusKey = event.key === TASK_SEARCH_FOCUS_KEY;
			const hasModifier = [event.metaKey, event.ctrlKey, event.altKey].some(Boolean);
			if (!isFocusKey || hasModifier) {
				return;
			}
			if (isTypingTarget(event.target)) {
				return;
			}
			event.preventDefault();
			inputRef.current?.focus();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [focusKey]);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		if (draft) {
			setDraft('');
			return;
		}
		inputRef.current?.blur();
	};

	const hasDraft = draft.length > 0;
	const showsKeycap = focusKey && !hasDraft;

	return (
		<label className={cn(controlGroupRecipe, 'h-8 w-56 gap-2 bg-card px-2.5', className)}>
			<Search className="size-4 shrink-0 text-muted-foreground" />
			<input
				ref={inputRef}
				type="search"
				value={draft}
				onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				aria-label={placeholder}
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 [&::-webkit-search-cancel-button]:hidden"
			/>
			{showsKeycap && (
				<kbd className={commandKeycapClass} aria-hidden="true">
					{TASK_SEARCH_FOCUS_KEY}
				</kbd>
			)}
			{hasDraft && (
				<button
					type="button"
					aria-label={t('common.CLEAR')}
					onClick={() => setDraft('')}
					className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
				>
					<X className="size-3.5" />
				</button>
			)}
		</label>
	);
}
