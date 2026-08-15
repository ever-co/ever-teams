'use client';

import { useAtom } from 'jotai';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
	}, [setIsOpen]);

	const closePanel = useCallback(() => {
		panelRef.current?.collapse();
		setIsOpen(false);
		setSizePixels(0);
	}, [setIsOpen]);

	const togglePanel = useCallback(() => {
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

	// Keep sizePixels in sync with actual DOM width via ResizeObserver.
	// useLayoutEffect ensures the value is correct BEFORE the browser paints,
	// so GlobalHeader never renders with a stale --chat-panel-width.
	useLayoutEffect(() => {
		const el = chatPanelDomRef.current;
		if (!el) return;

		// Synchronous read before paint
		setSizePixels(el.getBoundingClientRect().width);

		// Observe future changes (collapse, expand, drag, window resize)
		const observer = new ResizeObserver(() => {
			setSizePixels(el.getBoundingClientRect().width);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// On mount: if the atom says "closed" but no autoSave data collapsed the panel,
	// collapse it programmatically so the layout is consistent from the first frame.
	useLayoutEffect(() => {
		if (!isOpen && panelRef.current) {
			const currentSize = panelRef.current.getSize();
			if (currentSize > CHAT_PANEL_CONSTRAINTS.collapsedSize) {
				panelRef.current.collapse();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
