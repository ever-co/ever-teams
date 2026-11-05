// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import { marked } from 'marked';
import { memo, useId, useMemo, type ReactNode } from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '@/core/lib/helpers';
import { CodeBlock, CodeBlockCode } from './code-block';

export type MarkdownProps = {
	children: string;
	id?: string;
	className?: string;
	components?: Partial<Components>;
};

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

const LANGUAGE_CLASS = /language-([\w+#-]+)/;

const TRAILING_NEWLINE = /\n$/;

function parseMarkdownIntoBlocks(markdown: string): string[] {
	const tokens = marked.lexer(markdown);
	return tokens.map((token) => token.raw);
}

function extractLanguage(className?: string): string {
	if (!className) {
		return 'plaintext';
	}
	const match = LANGUAGE_CLASS.exec(className);
	if (!match) {
		return 'plaintext';
	}
	return match[1];
}

function isInlineCode(node: ExtraProps['node']) {
	const startLine = node?.position?.start.line;
	const endLine = node?.position?.end.line;
	if (!startLine) {
		return true;
	}
	return startLine === endLine;
}

function codeText(children: ReactNode) {
	if (typeof children === 'string') {
		return children.replace(TRAILING_NEWLINE, '');
	}
	if (Array.isArray(children)) {
		const joined = children.join('');
		return joined.replace(TRAILING_NEWLINE, '');
	}
	return '';
}

const INITIAL_COMPONENTS: Partial<Components> = {
	code: function CodeComponent({ className, children, node, ...props }) {
		if (isInlineCode(node)) {
			return (
				<code
					className={cn(
						'rounded-sm bg-foreground/6 px-1 py-px font-mono text-[0.85em] font-normal text-foreground before:content-none after:content-none',
						className
					)}
					{...props}
				>
					{children}
				</code>
			);
		}

		const language = extractLanguage(className);
		const code = codeText(children);

		return (
			<CodeBlock className="my-3">
				<CodeBlockCode code={code} language={language} />
			</CodeBlock>
		);
	},
	pre: function PreComponent({ children }) {
		return <>{children}</>;
	},
	// `node` is taken out so it is not spread onto the anchor
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	a: function LinkComponent({ children, node: _node, ...props }) {
		return (
			<a {...props} target="_blank" rel="noopener noreferrer">
				{children}
			</a>
		);
	}
};

const MemoizedMarkdownBlock = memo(
	function MarkdownBlock({
		content,
		components = INITIAL_COMPONENTS
	}: {
		content: string;
		components?: Partial<Components>;
	}) {
		return (
			<ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
				{content}
			</ReactMarkdown>
		);
	},
	function propsAreEqual(prevProps, nextProps) {
		return prevProps.content === nextProps.content;
	}
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

function MarkdownComponent({ children, id, className, components = INITIAL_COMPONENTS }: Readonly<MarkdownProps>) {
	const generatedId = useId();
	const blockId = id ?? generatedId;
	const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);

	return (
		<div className={className}>
			{blocks.map((block, index) => (
				<MemoizedMarkdownBlock key={`${blockId}-block-${index}`} content={block} components={components} />
			))}
		</div>
	);
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = 'Markdown';

export { Markdown };
