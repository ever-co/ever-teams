'use client';

import { memo, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChatLinkPreviews } from '@/core/hooks/chat/use-chat-link-previews';
import { previewLinksOf, type ChatLinkPreviewCard, type ChatPreviewLink } from '@/core/lib/utils/chat-link-preview';

/** The width a thumbnail is drawn at, in pixels; its height follows the picture's proportions. */
const THUMBNAIL_WIDTH = 96;

/** This app's own address: its links (a message, a task) open its own pages and get no card. */
function ownOrigin(): string | null {
	return typeof window === 'undefined' ? null : window.location.origin;
}

/**
 * One link's card: the site (its icon and name), the page's title and two lines of its description, and its picture
 * when it has one. The card is one link, named by the title and the site; every text is the platform's plain text.
 */
function LinkPreviewCard({ card }: Readonly<{ card: ChatLinkPreviewCard }>) {
	const t = useTranslations();
	const descriptionId = useId();
	const [iconBroken, setIconBroken] = useState(false);
	const [imageBroken, setImageBroken] = useState(false);
	const image = imageBroken ? null : card.image;

	return (
		<a
			href={card.href}
			target="_blank"
			rel="noopener noreferrer nofollow"
			aria-label={card.title ? t('teamChat.LINK_PREVIEW_LABEL', { title: card.title, site: card.site }) : t('teamChat.LINK_PREVIEW_SITE_LABEL', { site: card.site })}
			aria-describedby={card.description ? descriptionId : undefined}
			className="group/preview flex w-full max-w-md gap-3 rounded-lg bg-card p-2.5 text-start outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			data-link-preview={card.href}
		>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
					{card.icon && !iconBroken && (
						<img
							src={card.icon}
							alt=""
							width={16}
							height={16}
							loading="lazy"
							decoding="async"
							referrerPolicy="no-referrer"
							onError={() => setIconBroken(true)}
							className="size-4 shrink-0 rounded-sm object-contain"
						/>
					)}
					<span className="min-w-0 truncate" dir="auto">
						{card.site}
					</span>
				</span>
				{card.title && (
					<span
						className="line-clamp-2 text-[13px] font-medium leading-snug text-primary underline-offset-2 [overflow-wrap:anywhere] group-hover/preview:underline"
						dir="auto"
					>
						{card.title}
					</span>
				)}
				{card.description && (
					<span id={descriptionId} className="line-clamp-2 text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]" dir="auto">
						{card.description}
					</span>
				)}
			</span>
			{image && (
				// Its box is sized before it loads (width, then the stated proportions): the timeline does not move.
				<img
					src={image.src}
					alt={image.alt}
					width={THUMBNAIL_WIDTH}
					height={Math.round(THUMBNAIL_WIDTH / image.ratio)}
					loading="lazy"
					decoding="async"
					referrerPolicy="no-referrer"
					onError={() => setImageBroken(true)}
					style={{ aspectRatio: String(image.ratio) }}
					className="w-24 shrink-0 self-start rounded-md bg-foreground/[0.04] object-cover"
				/>
			)}
		</a>
	);
}

function LinkPreviewCards({ links }: Readonly<{ links: readonly ChatPreviewLink[] }>) {
	const cards = useChatLinkPreviews(links);
	if (!cards.length) return null;
	return (
		<div className="mt-1.5 flex flex-col gap-1.5">
			{cards.map((card) => (
				<LinkPreviewCard key={card.href} card={card} />
			))}
		</div>
	);
}

/**
 * The preview cards under a message, one per link it carries (three at most, code left out), from what the platform
 * fetched. Only mounted with `NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED` on; a link without a preview stays plain.
 */
function MessageLinkPreviewsComponent({ body }: Readonly<{ body: string }>) {
	const links = useMemo(() => previewLinksOf(body, { ownOrigin: ownOrigin() }), [body]);
	if (!links.length) return null;
	return <LinkPreviewCards links={links} />;
}

export const MessageLinkPreviews = memo(MessageLinkPreviewsComponent);
