'use client';

import { useEffect } from 'react';

type BubbleVisibility = 'hide' | 'show';

interface ChatwootApi {
	toggleBubbleVisibility?: (visibility: BubbleVisibility) => void;
}

function chatwootApi(): ChatwootApi | undefined {
	return (window as unknown as { $chatwoot?: ChatwootApi }).$chatwoot;
}

function setBubble(visibility: BubbleVisibility) {
	chatwootApi()?.toggleBubbleVisibility?.(visibility);
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
		hide();
		window.addEventListener('chatwoot:ready', hide);
		return () => {
			window.removeEventListener('chatwoot:ready', hide);
			setBubble('show');
		};
	}, [isHidden]);
}
