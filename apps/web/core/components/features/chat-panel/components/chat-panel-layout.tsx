'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { cn } from '@/core/lib/helpers';
import type { PropsWithChildren } from 'react';
import { CHAT_PANEL_CONSTRAINTS } from '../constants/chat-panel-constraints.constant';
import { useChatPanel } from '../hooks/use-chat-panel';
import { ChatView } from './chat-view';
import { Bot, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/core/constants/config/constants';

/** A 20px round hairline button on the panel edge: quiet until hovered. */
const EDGE_BUTTON =
	'flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:hover:text-white';

export function ChatPanelLayout({ children }: PropsWithChildren) {
	const chatPanel = useChatPanel();
	const t = useTranslations();
	const openAssistantLabel = t('chatView.OPEN_ASSISTANT', { appName: APP_NAME });

	return (
		// Provide chat controls to the entire subtree (children included)
		<div
			className="relative flex h-full w-full overflow-hidden"
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
					className={cn('bg-background border-r border-border', 'z-60 relative overflow-hidden')}
				>
					<div ref={chatPanel.chatPanelDomRef} className="flex h-full flex-col">
						<ChatView />
					</div>
				</ResizablePanel>

				{/* ── HANDLE ──────────────────────────────────────────────── */}
				<ResizableHandle className="z-[1020] relative" />

				{/* ── PANEL 2 : Page Content ───────────────────────────────── */}
				<ResizablePanel
					order={2}
					defaultSize={100 - CHAT_PANEL_CONSTRAINTS.defaultSize}
					minSize={50}
					className="relative"
				>
					<div className="absolute inset-0 overflow-hidden">{children}</div>
				</ResizablePanel>
			</ResizablePanelGroup>

			{/* Edge controls, as in Ever Works: collapse ‹ · grip (standard width) · › widen. */}
			{chatPanel.isOpen ? (
				<div
					className="absolute top-1/2 z-[1030] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
					style={{ left: `${chatPanel.sizePixels}px` }}
					aria-label={t('chatView.PANEL_CONTROLS')}
				>
					<button
						type="button"
						onClick={chatPanel.closePanel}
						className={EDGE_BUTTON}
						title={t('chatView.COLLAPSE_ASSISTANT')}
						aria-label={t('chatView.COLLAPSE_ASSISTANT')}
					>
						<ChevronLeft className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={() => chatPanel.resizePanel(CHAT_PANEL_CONSTRAINTS.defaultSize)}
						className={cn(EDGE_BUTTON, 'h-6 w-4 cursor-col-resize rounded-sm')}
						title={t('chatView.STANDARD_ASSISTANT_WIDTH')}
						aria-label={t('chatView.STANDARD_ASSISTANT_WIDTH')}
					>
						<GripVertical className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={() => chatPanel.resizePanel(CHAT_PANEL_CONSTRAINTS.maxSize)}
						className={EDGE_BUTTON}
						title={t('chatView.EXPAND_ASSISTANT')}
						aria-label={t('chatView.EXPAND_ASSISTANT')}
					>
						<ChevronRight className="size-3.5" />
					</button>
				</div>
			) : (
				// Closed, from md up: the open button sits on the sidebar's edge (app-sidebar.tsx
				// ChatPanelOpenButton). Below md the sidebar is a sheet, so this one keeps the assistant
				// reachable on phones.
				<button
					type="button"
					onClick={chatPanel.openPanel}
					className={cn(EDGE_BUTTON, 'absolute left-2 top-1/2 z-[1030] size-8 -translate-y-1/2 shadow-sm md:hidden')}
					title={openAssistantLabel}
					aria-label={openAssistantLabel}
				>
					<Bot className="size-4" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}
