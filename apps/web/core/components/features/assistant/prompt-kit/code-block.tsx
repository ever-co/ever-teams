// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import { useEffect, useState, type HTMLAttributes, type HTMLProps, type ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

export type CodeBlockProps = {
	children?: ReactNode;
	className?: string;
} & HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
	return (
		<div
			className={cn(
				'not-prose flex w-full flex-col overflow-clip rounded-xl bg-foreground/2.5 text-foreground hairline-ring ring-border',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

const PLAIN_LANGUAGE = 'text';

async function highlightCode(code: string, language: string) {
	const { codeToHtml } = await import('shiki');
	try {
		return await codeToHtml(code, { lang: language, themes: SHIKI_THEMES });
	} catch {
		return codeToHtml(code, { lang: PLAIN_LANGUAGE, themes: SHIKI_THEMES });
	}
}

async function highlightCodeSafely(code: string, language: string): Promise<string | null> {
	try {
		return await highlightCode(code, language);
	} catch {
		return null;
	}
}

const codeSurfaceRecipe =
	'w-full overflow-x-auto font-mono text-[13px] leading-5 [&_pre]:bg-transparent! [&>pre]:px-4 [&>pre]:py-3 dark:[&_.shiki]:text-(--shiki-dark)! dark:[&_.shiki_span]:text-(--shiki-dark)!';

export type CodeBlockCodeProps = {
	code: string;
	language?: string;
	className?: string;
} & HTMLProps<HTMLDivElement>;

function CodeBlockCode({ code, language = 'tsx', className, ...props }: CodeBlockCodeProps) {
	const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;
		const applyHighlight = (html: string | null) => {
			if (isCurrent) {
				setHighlightedHtml(html);
			}
		};
		const highlighting = highlightCodeSafely(code, language);
		void highlighting.then(applyHighlight);
		return () => {
			isCurrent = false;
		};
	}, [code, language]);

	const classNames = cn(codeSurfaceRecipe, className);

	if (highlightedHtml) {
		return <div className={classNames} dangerouslySetInnerHTML={{ __html: highlightedHtml }} {...props} />;
	}

	return (
		<div className={classNames} {...props}>
			<pre>
				<code>{code}</code>
			</pre>
		</div>
	);
}

export type CodeBlockGroupProps = HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({ children, className, ...props }: CodeBlockGroupProps) {
	return (
		<div className={cn('flex items-center justify-between', className)} {...props}>
			{children}
		</div>
	);
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
