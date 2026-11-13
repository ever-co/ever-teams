import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows the team chat (`NEXT_PUBLIC_CHAT_ENABLED=true`, read at runtime so a published image
 * is switched without a rebuild). Off by default. The AI assistant is a separate entry and is not affected.
 */
export function isChatEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_CHAT_ENABLED') || process.env.NEXT_PUBLIC_CHAT_ENABLED;
	return runtimeFlag === 'true';
}

/**
 * Whether the conversation's timeline renders only the messages near the reader's place (a virtualised list:
 * `NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED=true`, read at runtime). Off by default: a long conversation then keeps
 * every loaded message in the page, as before.
 */
export function isChatVirtualListEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED') || process.env.NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED;
	return runtimeFlag === 'true';
}

/**
 * Whether a message shows a preview card under the links it carries (`NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED=true`,
 * read at runtime), from what the platform's `/chat/link-preview` answers (it fetches the pages; the browser fetches
 * none). Off by default: links then stay plain and nothing is asked. A platform without the route (it answers 404
 * unless `GAUZY_CHAT_LINK_PREVIEWS_ENABLED=true`) shows none either.
 */
export function isChatLinkPreviewsEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED') || process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED;
	return runtimeFlag === 'true';
}

/**
 * Whether a preview card also shows the page's picture (`NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED=true`, read at
 * runtime, on top of the previews themselves). The picture comes from the platform (`/chat/link-preview/image`, which
 * fetched it and serves it; on when `GAUZY_CHAT_LINK_PREVIEW_IMAGES_ENABLED=true`), never from the linked site, so the
 * reader's browser still calls no other site. Off by default: cards stay text only.
 */
export function isChatLinkPreviewPicturesEnabled(): boolean {
	const runtimeFlag =
		readRuntimeEnv('NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED') || process.env.NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED;
	return runtimeFlag === 'true' && isChatLinkPreviewsEnabled();
}

/**
 * Whether app messages (posted by the platform's incoming webhooks) show their blocks and buttons
 * (`NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED=true`, read at runtime). Off by default: an app message then shows its text
 * only, as before. A button calls the platform, which answers 404 where its webhooks are off.
 */
export function isChatWebhooksEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED') || process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED;
	return runtimeFlag === 'true';
}
