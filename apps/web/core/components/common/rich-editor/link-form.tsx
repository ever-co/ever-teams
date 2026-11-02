'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function withScheme(value: string) {
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
	if (hasScheme) {
		return value;
	}
	return `https://${value}`;
}

export function linkLabelOf(hasLink: boolean, editLabel: string, addLabel: string) {
	if (hasLink) {
		return editLabel;
	}
	return addLabel;
}

/** The Remove action exists only when the caret or the selection is on a link. */
export function removeHandlerOf(hasLink: boolean, removeLink: () => void) {
	if (!hasLink) {
		return undefined;
	}
	return removeLink;
}

/** "example.com" becomes "https://example.com"; anything that is not a web or mail address becomes null. */
export function normalizeHref(raw: string): string | null {
	const value = raw.trim();
	if (!value) {
		return null;
	}
	try {
		const url = new URL(withScheme(value));
		if (!SAFE_PROTOCOLS.has(url.protocol)) {
			return null;
		}
		return url.href;
	} catch {
		return null;
	}
}

/**
 * The row a link is edited in, drawn in place inside the toolbars rather than in a portal: a layer elsewhere in the
 * page would take the focus out of the editor (and out of a dialog that hosts it). Enter applies, Escape cancels.
 */
export function LinkForm({
	initial,
	onApply,
	onRemove,
	onCancel
}: {
	initial: string;
	onApply: (href: string) => void;
	onRemove?: () => void;
	onCancel: () => void;
}) {
	const t = useTranslations();
	const [value, setValue] = useState(initial);
	const [invalid, setInvalid] = useState(false);

	function apply() {
		const href = normalizeHref(value);
		if (!href) {
			setInvalid(true);
			return;
		}
		onApply(href);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.preventDefault();
			apply();
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onCancel();
		}
	}

	return (
		<div className="flex min-w-0 items-center gap-1" role="group" aria-label={t('richEditor.LINK')}>
			<Input
				type="url"
				inputMode="url"
				autoFocus
				value={value}
				aria-label={t('richEditor.LINK_ADDRESS')}
				aria-invalid={invalid || undefined}
				placeholder={t('richEditor.LINK_PLACEHOLDER')}
				onChange={(event) => {
					setValue(event.target.value);
					setInvalid(false);
				}}
				onKeyDown={handleKeyDown}
				className="h-7 w-56 min-w-0 text-xs md:text-xs"
			/>
			{invalid && (
				<span role="alert" className="sr-only">
					{t('richEditor.LINK_INVALID')}
				</span>
			)}
			<Button type="button" size="icon-sm" aria-label={t('richEditor.APPLY_LINK')} onClick={apply}>
				<Check aria-hidden="true" />
			</Button>
			{onRemove && (
				<Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onRemove}>
					{t('richEditor.REMOVE_LINK')}
				</Button>
			)}
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={t('richEditor.CANCEL')}
				className="text-muted-foreground"
				onClick={onCancel}
			>
				<X aria-hidden="true" />
			</Button>
		</div>
	);
}
