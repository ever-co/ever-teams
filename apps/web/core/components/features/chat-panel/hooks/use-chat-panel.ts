'use client';

import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { chatPanelOpenAtom } from '../atoms/chat-panel-open.atom';
import { CHAT_PANEL_CONSTRAINTS } from '../constants/chat-panel-constraints.constant';

/**
 * useChatPanel — Manages the imperative API of the chat ResizablePanel
 */
export function useChatPanel() {
	/**
	 * A ref on the wrapper div of the chat panel DOM node
	 */
	const chatPanelDomRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<ImperativePanelHandle>(null);

	const [isOpen, setIsOpen] = useAtom(chatPanelOpenAtom);
	const [sizePixels, setSizePixels] = useState<number>(0);

	const openPanel = useCallback(() => {
		panelRef.current?.expand();
		setIsOpen(true);
		setSizePixels(CHAT_PANEL_CONSTRAINTS.defaultSize);
	}, [setIsOpen]);

	const closePanel = useCallback(() => {
		console.log(panelRef.current);
		panelRef.current?.collapse();
		setIsOpen(false);
		setSizePixels(0);
	}, [setIsOpen]);

	const togglePanel = useCallback(() => {
		console.log(panelRef.current?.getSize());
		if (isOpen) {
			closePanel();
		} else {
			openPanel();
		}
	}, [isOpen, openPanel, closePanel]);

	const handleResize = useCallback(() => {
		if (chatPanelDomRef.current) {
			const { width } = chatPanelDomRef.current.getBoundingClientRect();
			setSizePixels(width);
		}
	}, []);

	useEffect(() => {
		handleResize();
	}, []);

	return {
		panelRef,
		isOpen,
		togglePanel,
		openPanel,
		closePanel,
		chatPanelDomRef,
		sizePixels,
		setSizePixels,
		handleResize
	};
}
