'use client';

import DOMPurify from 'dompurify';
import { useMemo, useSyncExternalStore, type HTMLAttributes, type ReactNode } from 'react';
import { storedTextToEditorHtml } from '@/core/lib/helpers/rich-text-format';
import { cn } from '@/core/lib/helpers';
import styles from './rich-text.module.css';

export type RichTextViewProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> & {
	/** A stored description in any format the editors ever wrote: HTML, Slate JSON, Markdown or plain text. */
	value: string | null | undefined;
	/** Shown instead of the text when the description is empty. */
	emptyState?: ReactNode;
};

const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

const SANITIZE_CONFIG = {
	ADD_ATTR: ['target'],
	FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'iframe']
};

let viewPurifier: ReturnType<typeof DOMPurify> | null = null;

function keepOnlyAlignment(element: HTMLElement) {
	const alignment = element.style.textAlign;
	element.removeAttribute('style');
	if (ALIGNMENTS.has(alignment)) {
		element.style.textAlign = alignment;
	}
}

function hardenNode(node: Element) {
	if (node.hasAttribute('style')) {
		keepOnlyAlignment(node as HTMLElement);
	}
	if (node.tagName === 'A') {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer nofollow');
	}
	if (node.tagName === 'INPUT') {
		node.setAttribute('type', 'checkbox');
		node.setAttribute('disabled', '');
		node.setAttribute('tabindex', '-1');
	}
}

/** Its own DOMPurify instance, so these hooks never reach the other sanitizers of the app. */
function purifier() {
	if (!viewPurifier) {
		viewPurifier = DOMPurify(window);
		viewPurifier.addHook('afterSanitizeAttributes', hardenNode);
	}
	return viewPurifier;
}

function subscribeToNothing() {
	return () => {};
}

function isOnClient() {
	return true;
}

function isOnServer() {
	return false;
}

/**
 * A description as it reads, without loading the editor: the stored text turned into HTML, sanitized, and drawn
 * with the same styles as the editor (to-do items, mention chips, code, pictures). Links open in a new tab and
 * to-do boxes are shown, not toggled. Sanitizing needs the browser, so a server render outputs the empty state.
 */
export function RichTextView({ value, emptyState = null, className, ...rest }: RichTextViewProps) {
	const isClient = useSyncExternalStore(subscribeToNothing, isOnClient, isOnServer);
	const html = useMemo(() => {
		if (!isClient) {
			return '';
		}
		const stored = storedTextToEditorHtml(value);
		if (!stored) {
			return '';
		}
		return purifier().sanitize(stored, SANITIZE_CONFIG);
	}, [isClient, value]);

	if (!html) {
		return <>{emptyState}</>;
	}

	return (
		<div
			{...rest}
			className={cn('prose prose-sm max-w-none', styles.content, className)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
