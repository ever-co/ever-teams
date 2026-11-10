'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, splitMentions } from '@/core/lib/utils/chat-format';

/** The elements a message may render: the formatting subset, nothing that runs or embeds. `span` is a mention chip. */
const ALLOWED_ELEMENTS = ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'span'];

const MENTION_CHIP = 'rounded-sm bg-primary/10 px-1 py-px font-medium text-primary';
const MENTION_ME = 'bg-amber-500/15 text-amber-700 dark:text-amber-300';

/** The mention tokens of a body: `<@employeeId>`, `<#conversationId>`, `<!channel>`, `<!here>`. */
const MENTION_TOKEN = /<[@#!][^>\s]+>/g;

/**
 * Escapes the tokens' `<`, so the parser keeps them as text: `<!channel>` would otherwise read as raw HTML and be
 * dropped with the rest of the HTML.
 */
/** A code block or a code span (kept as it is), or a mention token. */
const CODE_OR_TOKEN = /(```[\s\S]*?```|`[^`\n]*`)|<[@#!][^>\s]+>/g;

export function escapeMentionTokens(body: string): string {
	// Code is literal (a backslash would show there), and a token in it is not a mention.
	return body.replace(CODE_OR_TOKEN, (match: string, code: string | undefined) => (code ? match : `\\${match}`));
}

interface HastNode {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
}

/** Splits every text node (outside code) into text and a `span` per mention token, which the renderer turns into a chip. */
function splitTokens(node: HastNode): void {
	if (!node.children || node.tagName === 'code' || node.tagName === 'pre') return;
	const children: HastNode[] = [];
	for (const child of node.children) {
		if (child.type !== 'text' || !child.value || !child.value.includes('<')) {
			splitTokens(child);
			children.push(child);
			continue;
		}
		let last = 0;
		for (const match of child.value.matchAll(MENTION_TOKEN)) {
			const at = match.index ?? 0;
			if (at > last) children.push({ type: 'text', value: child.value.slice(last, at) });
			children.push({ type: 'element', tagName: 'span', properties: { dataChatToken: match[0] }, children: [] });
			last = at + match[0].length;
		}
		if (last < child.value.length) children.push({ type: 'text', value: child.value.slice(last) });
	}
	node.children = children;
}

/** The rehype step of the mention chips (react-markdown renders text nodes itself, so they are split beforehand). */
function rehypeMentionTokens() {
	return (tree: HastNode) => splitTokens(tree);
}

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeMentionTokens];

/** One mention token as its chip. */
function MentionChip({
	token,
	people,
	conversations,
	meEmployeeId
}: Readonly<{ token: string; people: ReadonlyMap<string, ChatPerson>; conversations: ReadonlyMap<string, string>; meEmployeeId: string | null }>) {
	const parts = useMemo(() => splitMentions(token, people, conversations, meEmployeeId), [conversations, meEmployeeId, people, token]);
	return (
		<>
			{parts.map((part, index) => {
				if (part.kind === 'text') return <span key={index}>{part.text}</span>;
				if (part.kind === 'mention') {
					return (
						<span key={index} className={cn(MENTION_CHIP, part.isMe && MENTION_ME)} data-employee-id={part.employeeId}>
							@{part.label}
						</span>
					);
				}
				if (part.kind === 'channel') {
					return (
						<span key={index} className={MENTION_CHIP}>
							#{part.label}
						</span>
					);
				}
				return (
					<span key={index} className={cn(MENTION_CHIP, MENTION_ME)}>
						@{part.label}
					</span>
				);
			})}
		</>
	);
}

/**
 * A message body: the Markdown subset (bold, italic, ~~strike~~, code, links, lists, quotes) with mention tokens as
 * chips. Links open in a new tab and never carry the referrer; nothing else of HTML is let through.
 */
function ChatMarkdownComponent({
	body,
	people,
	conversations,
	meEmployeeId,
	className
}: Readonly<{
	body: string;
	people: ReadonlyMap<string, ChatPerson>;
	conversations: ReadonlyMap<string, string>;
	meEmployeeId: string | null;
	className?: string;
}>) {
	const components = useMemo<Components>(
		() => ({
			a: ({ href, children }) => (
				<a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
					{children}
				</a>
			),
			// A line break typed in a message (Shift+Enter) shows as one: the paragraph keeps its line breaks. The parser
			// follows a hard break with a line break of its own, so the `<br>` is left out, or the line would break twice.
			p: ({ children }) => <p className="mb-1 whitespace-pre-wrap last:mb-0">{children}</p>,
			br: () => null,
			// A fenced block reaches here as `pre > code`, and `pre` draws its box: a fence without a language carries
			// no class, so the box cannot depend on one.
			code: ({ children }) => <code className="rounded-sm bg-foreground/[0.06] px-1 py-px font-mono text-[12px]">{children}</code>,
			pre: ({ children }) => (
				<pre className="my-1 overflow-x-auto rounded-lg bg-foreground/[0.05] px-3 py-2 font-mono text-xs leading-relaxed hairline-ring ring-border [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-xs">{children}</pre>
			),
			ul: ({ children }) => <ul className="my-1 list-disc ps-5">{children}</ul>,
			ol: ({ children }) => <ol className="my-1 list-decimal ps-5">{children}</ol>,
			blockquote: ({ children }) => <blockquote className="my-1 border-s-2 border-border ps-3 text-muted-foreground">{children}</blockquote>,
			span: ({ node, children }) => {
				const token = node?.properties?.['dataChatToken'];
				if (typeof token !== 'string') return <span>{children}</span>;
				return <MentionChip token={token} people={people} conversations={conversations} meEmployeeId={meEmployeeId} />;
			}
		}),
		[conversations, meEmployeeId, people]
	);
	const source = useMemo(() => escapeMentionTokens(body), [body]);

	return (
		<div className={cn('break-words text-[13px] leading-relaxed text-foreground [&_a]:break-all', className)}>
			<ReactMarkdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed skipHtml remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={components}>
				{source}
			</ReactMarkdown>
		</div>
	);
}

export const ChatMarkdown = memo(ChatMarkdownComponent);
