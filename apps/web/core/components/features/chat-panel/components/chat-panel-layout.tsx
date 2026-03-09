'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { cn } from '@/core/lib/helpers';
import type { PropsWithChildren } from 'react';
import { CHAT_PANEL_CONSTRAINTS } from '../constants/chat-panel-constraints.constant';
import { ChatPanelContext } from '../contexts/chat-panel.context';
import { useChatPanel } from '../hooks/use-chat-panel';

export function ChatPanelLayout({ children }: PropsWithChildren) {
	const chatPanel = useChatPanel();

	return (
		// Provide chat controls to the entire subtree (children included)
		<ChatPanelContext.Provider value={chatPanel}>
			<div
				className="relative flex h-full w-full"
				style={
					{
						'--chat-panel-width': `${chatPanel.sizePixels}px`
					} as React.CSSProperties
				}
			>
				<ResizablePanelGroup direction="horizontal" autoSaveId="chat-content-layout" className="h-full w-full">
					{/* ── PANEL 1 : Chat ──────────────────────────────────────── */}
					<ResizablePanel
						ref={chatPanel.panelRef}
						order={1}
						defaultSize={CHAT_PANEL_CONSTRAINTS.defaultSize}
						minSize={CHAT_PANEL_CONSTRAINTS.minSize}
						maxSize={CHAT_PANEL_CONSTRAINTS.maxSize}
						collapsedSize={CHAT_PANEL_CONSTRAINTS.collapsedSize}
						collapsible
						onCollapse={chatPanel.closePanel}
						onExpand={chatPanel.openPanel}
						onResize={chatPanel.handleResize}
						className={cn('bg-muted/30 border-r', 'z-60 relative')}
					>
						<div ref={chatPanel.chatPanelDomRef} className="flex h-full flex-col p-4 bg-dark">
							<p className="text-sm font-semibold">Chat</p>
						</div>
					</ResizablePanel>

					{/* ── HANDLE ──────────────────────────────────────────────── */}
					<ResizableHandle withHandle className="z-100 relative" />

					{/* ── PANEL 2 : Page Content ───────────────────────────────── */}
					<ResizablePanel
						order={2}
						defaultSize={100 - CHAT_PANEL_CONSTRAINTS.defaultSize}
						minSize={50}
						className="overflow-auto"
					>
						{children}
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</ChatPanelContext.Provider>
	);
}
