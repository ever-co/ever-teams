'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check, Copy } from '@/core/components/icons';

/** How long the button reads "Copied". */
const COPIED_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

/** The browser's clipboard, when it offers one (not on a page served over plain http, except on localhost). */
function clipboardOf(): Clipboard | undefined {
	if (typeof navigator === 'undefined') {
		return undefined;
	}
	return navigator.clipboard;
}

function statusKeyOf(state: CopyState): DottedLanguageObjectStringPaths | null {
	if (state === 'copied') {
		return 'settings.apiTokens.COPY_DONE';
	}
	if (state === 'failed') {
		return 'settings.apiTokens.COPY_FAILED';
	}
	return null;
}

/**
 * A new token's secret, shown this once: read only, with a copy button drawn at rest. The button keeps its name when
 * it reads "Copied"; the outcome is announced by a status region outside it. Without a clipboard (a page served over
 * plain http on an address other than localhost), the secret is selected so that the person copies it themselves.
 */
export function ApiTokenSecret({ value }: Readonly<{ value: string }>) {
	const t = useTranslations();
	const fieldId = useId();
	const fieldRef = useRef<HTMLInputElement>(null);
	const [copyState, setCopyState] = useState<CopyState>('idle');

	useEffect(() => {
		if (copyState !== 'copied') {
			return;
		}
		const timer = window.setTimeout(() => setCopyState('idle'), COPIED_MS);
		return () => window.clearTimeout(timer);
	}, [copyState]);

	const selectSecret = () => {
		const field = fieldRef.current;
		if (!field) {
			return;
		}
		field.focus();
		field.select();
	};

	const copy = async () => {
		const clipboard = clipboardOf();
		if (!clipboard?.writeText) {
			selectSecret();
			setCopyState('failed');
			return;
		}
		try {
			await clipboard.writeText(value);
			setCopyState('copied');
		} catch {
			selectSecret();
			setCopyState('failed');
		}
	};

	const isCopied = copyState === 'copied';
	let buttonIcon = <Copy aria-hidden="true" />;
	let buttonText = t('settings.apiTokens.COPY');
	if (isCopied) {
		buttonIcon = <Check aria-hidden="true" />;
		buttonText = t('settings.apiTokens.COPIED');
	}
	const statusKey = statusKeyOf(copyState);
	let statusText = '';
	if (statusKey) {
		statusText = t(statusKey);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={fieldId} className="text-xs font-medium text-foreground">
				{t('settings.apiTokens.SECRET_LABEL')}
			</label>
			<div className="flex items-center gap-2">
				<Input
					id={fieldId}
					ref={fieldRef}
					readOnly
					value={value}
					onFocus={(event) => event.currentTarget.select()}
					spellCheck={false}
					autoComplete="off"
					className="min-w-0 flex-1 font-mono text-xs md:text-xs"
				/>
				<Button
					type="button"
					variant="outline"
					onClick={copy}
					aria-label={t('settings.apiTokens.COPY_TOKEN')}
					className="shrink-0"
				>
					{buttonIcon}
					{buttonText}
				</Button>
			</div>
			<p role="status" className="min-h-4 text-xs text-muted-foreground">
				{statusText}
			</p>
		</div>
	);
}
