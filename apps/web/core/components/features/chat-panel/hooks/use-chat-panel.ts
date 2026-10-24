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

	const resizePanel = useCallback(
		(size: number) => {
			panelRef.current?.resize(size);
			setIsOpen(size > CHAT_PANEL_CONSTRAINTS.collapsedSize);
		},
		[setIsOpen]
	);

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

	// Keep the panel in step with the shared atom: on mount (autoSave data may disagree with it)
	// and whenever something outside this layout flips it — the open button on the sidebar's
	// edge only sets the atom, it has no handle on the panel.
	useLayoutEffect(() => {
		const panel = panelRef.current;
		if (!panel) return;
		const currentSize = panel.getSize();
		if (!isOpen && currentSize > CHAT_PANEL_CONSTRAINTS.collapsedSize) {
			panel.collapse();
		} else if (isOpen && currentSize <= CHAT_PANEL_CONSTRAINTS.collapsedSize) {
			panel.expand();
		}
	}, [isOpen]);

	return {
		panelRef,
		isOpen,
		togglePanel,
		openPanel,
		closePanel,
		resizePanel,
		chatPanelDomRef,
		sizePixels,
		setSizePixels,
		handleResize
	};
}
