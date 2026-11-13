'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Search, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const SEARCH_DEBOUNCE_MS = 150;

/** The search field of a list page's toolbar; the placeholder is also its accessible name. */
export function ListSearchField({
	value,
	onChange,
	placeholder
}: Readonly<{ value: string; onChange: (value: string) => void; placeholder: string }>) {
	const t = useTranslations();
	const [draft, setDraft] = useState(value);

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

	const hasDraft = draft.length > 0;

	return (
		<label className={cn(controlGroupRecipe, 'h-8 w-full gap-2 bg-card px-2.5 sm:w-60')}>
			<Search className="size-4 shrink-0 text-muted-foreground" />
			<input
				type="search"
				value={draft}
				onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 [&::-webkit-search-cancel-button]:hidden"
			/>
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
