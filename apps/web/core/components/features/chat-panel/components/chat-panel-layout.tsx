'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { cn } from '@/core/lib/helpers';
import type { PropsWithChildren } from 'react';
import { CHAT_PANEL_CONSTRAINTS } from '../constants/chat-panel-constraints.constant';
import { useChatPanel } from '../hooks/use-chat-panel';
import { ChatView } from './chat-view';

export function ChatPanelLayout({ children }: PropsWithChildren) {
	const chatPanel = useChatPanel();

	return (
		// Provide chat controls to the entire subtree (children included)
		<div
			className="flex h-full w-full overflow-hidden"
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
					className={cn('bg-muted/30 border-r', 'z-60 relative overflow-hidden')}
				>
					<div ref={chatPanel.chatPanelDomRef} className="flex h-full flex-col">
						<ChatView />
					</div>
				</ResizablePanel>

				{/* ── HANDLE ──────────────────────────────────────────────── */}
				<ResizableHandle withHandle className="z-1020 relative" />

				{/* ── PANEL 2 : Page Content ───────────────────────────────── */}
				<ResizablePanel
					order={2}
					defaultSize={100 - CHAT_PANEL_CONSTRAINTS.defaultSize}
					minSize={50}
					className="relative"
				>
					<div className="absolute inset-0 overflow-y-auto">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
