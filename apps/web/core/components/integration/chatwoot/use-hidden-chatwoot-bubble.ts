'use client';

import { useEffect } from 'react';

type BubbleVisibility = 'hide' | 'show';

interface ChatwootApi {
	toggleBubbleVisibility?: (visibility: BubbleVisibility) => void;
}

/** The element Chatwoot draws its bubble in; the SDK's API exists a moment before it does. */
const BUBBLE_HOLDER_SELECTOR = '.woot--bubble-holder';

function chatwootApi(): ChatwootApi | undefined {
	return (window as unknown as { $chatwoot?: ChatwootApi }).$chatwoot;
}

/**
 * `toggleBubbleVisibility` throws when called before the bubble exists, so the call waits for its holder; until
 * then the `chatwoot:ready` listener applies the choice once the widget is drawn.
 */
function setBubble(visibility: BubbleVisibility) {
	const hasBubble = document.querySelector(BUBBLE_HOLDER_SELECTOR) !== null;
	if (!hasBubble) {
		return;
	}
	try {
		chatwootApi()?.toggleBubbleVisibility?.(visibility);
	} catch {
		// A Chatwoot that cannot hide its bubble leaves it as it was; Ever SI still works.
	}
}

/**
 * Hides the Chatwoot support bubble while `isHidden` holds, and shows it again after. The bubble floats over
 * everything (Chatwoot's z-index is the highest there is), so on a phone it covers the send button of a full-screen
 * composer such as Ever SI's. The SDK may still be loading when this runs: its `chatwoot:ready` event hides it then.
 * Without Chatwoot on the deployment this does nothing.
 */
export function useHiddenChatwootBubble(isHidden: boolean) {
	useEffect(() => {
		if (!isHidden) {
			return;
		}
		const hide = () => setBubble('hide');
		window.addEventListener('chatwoot:ready', hide);
		hide();
		return () => {
			window.removeEventListener('chatwoot:ready', hide);
			setBubble('show');
		};
	}, [isHidden]);
}
