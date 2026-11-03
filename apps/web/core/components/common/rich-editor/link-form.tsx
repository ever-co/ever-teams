'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { hasUrlScheme } from '@/core/lib/utils/url-scheme';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const BARE_EMAIL_PATTERN = /^[^\s@/:]+@[^\s@/:]+$/;

function withScheme(value: string) {
	const isBareEmail = BARE_EMAIL_PATTERN.test(value);
	if (isBareEmail) {
		return `mailto:${value}`;
	}
	const hasScheme = hasUrlScheme(value);
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

/** "example.com" becomes "https://example.com" and "name@example.com" a mail link; anything that is not a web or mail address becomes null. */
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
}: Readonly<{
	initial: string;
	onApply: (href: string) => void;
	onRemove?: () => void;
	onCancel: () => void;
}>) {
	const t = useTranslations();
	const [value, setValue] = useState(initial);
	const [invalid, setInvalid] = useState(false);
	const errorId = useId();
	let errorDescription: string | undefined;
	if (invalid) {
		errorDescription = errorId;
	}

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
		<fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0" aria-label={t('richEditor.LINK')}>
			<div className="flex min-w-0 items-center gap-1">
				<Input
					type="url"
					inputMode="url"
					autoFocus
					value={value}
					aria-label={t('richEditor.LINK_ADDRESS')}
					aria-invalid={invalid || undefined}
					aria-describedby={errorDescription}
					placeholder={t('richEditor.LINK_PLACEHOLDER')}
					onChange={(event) => {
						setValue(event.target.value);
						setInvalid(false);
					}}
					onKeyDown={handleKeyDown}
					className="h-7 w-56 min-w-0 text-xs md:text-xs"
				/>
				<Button type="button" size="icon-sm" aria-label={t('richEditor.APPLY_LINK')} onClick={apply}>
					<Check aria-hidden="true" />
				</Button>
				{onRemove && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-muted-foreground"
						onClick={onRemove}
					>
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
			{invalid && (
				<p id={errorId} role="alert" className="px-1 text-xs text-destructive-ink">
					{t('richEditor.LINK_INVALID')}
				</p>
			)}
		</fieldset>
	);
}
