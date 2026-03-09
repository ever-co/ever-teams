'use client';

import { createContext, useContext } from 'react';

/**
 * ChatPanelContext — Exposes chat panel controls to any child component
 */
interface ChatPanelContextValue {
	isOpen: boolean;
	togglePanel: () => void;
	openPanel: () => void;
	closePanel: () => void;
}

export const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function useChatPanelContext() {
	const ctx = useContext(ChatPanelContext);
	if (!ctx) {
		throw new Error('useChatPanelContext must be used inside LayoutShell');
	}
	return ctx;
}
