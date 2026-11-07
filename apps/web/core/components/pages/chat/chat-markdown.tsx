'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, splitMentions } from '@/core/lib/utils/chat-format';

/** The elements a message may render: the formatting subset, nothing that runs or embeds. */
const ALLOWED_ELEMENTS = ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote'];

const MENTION_CHIP = 'rounded-sm bg-primary/10 px-1 py-px font-medium text-primary';
const MENTION_ME = 'bg-amber-500/15 text-amber-700 dark:text-amber-300';

/** A text node with its mention tokens turned into chips. */
function MentionedText({
	text,
	people,
	conversations,
	meEmployeeId
}: Readonly<{ text: string; people: ReadonlyMap<string, ChatPerson>; conversations: ReadonlyMap<string, string>; meEmployeeId: string | null }>) {
	const parts = useMemo(() => splitMentions(text, people, conversations, meEmployeeId), [conversations, meEmployeeId, people, text]);
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
 * A message body: the Markdown subset (bold, italic, strike, code, links, lists, quotes) with mention tokens as
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
			p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
			code: ({ children, className: codeClass }) =>
				codeClass ? <code className="block overflow-x-auto rounded-md bg-foreground/[0.06] p-2 text-xs">{children}</code> : <code className="rounded-sm bg-foreground/[0.06] px-1 py-px text-[12px]">{children}</code>,
			pre: ({ children }) => <pre className="my-1">{children}</pre>,
			ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
			ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
			blockquote: ({ children }) => <blockquote className="my-1 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>,
			text: ({ children }) => <MentionedText text={String(children ?? '')} people={people} conversations={conversations} meEmployeeId={meEmployeeId} />
		}),
		[conversations, meEmployeeId, people]
	);

	return (
		<div className={cn('break-words text-[13px] leading-relaxed text-foreground [&_a]:break-all', className)}>
			<ReactMarkdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed skipHtml components={components}>
				{body}
			</ReactMarkdown>
		</div>
	);
}

export const ChatMarkdown = memo(ChatMarkdownComponent);
