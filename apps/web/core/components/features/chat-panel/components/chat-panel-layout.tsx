'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/core/components/common/resizable';
import { cn } from '@/core/lib/helpers';
import type { PropsWithChildren } from 'react';
import { CHAT_PANEL_CONSTRAINTS } from '../constants/chat-panel-constraints.constant';
import { useChatPanel } from '../hooks/use-chat-panel';
import { ChatView } from './chat-view';
import { Bot, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChatPanelLayout({ children }: PropsWithChildren) {
	const chatPanel = useChatPanel();
	const t = useTranslations('chatView');

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
					className={cn('bg-muted/30 border-r', 'z-60 relative overflow-hidden')}
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

			{chatPanel.isOpen ? (
				<div
					className="absolute top-1/2 z-[1030] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
					style={{ left: `${chatPanel.sizePixels}px` }}
					aria-label={t('PANEL_CONTROLS')}
				>
					<button
						type="button"
						onClick={chatPanel.closePanel}
						className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
						title={t('COLLAPSE_ASSISTANT')}
						aria-label={t('COLLAPSE_ASSISTANT')}
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => chatPanel.resizePanel(CHAT_PANEL_CONSTRAINTS.defaultSize)}
						className="border-t p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
						title={t('STANDARD_ASSISTANT_WIDTH')}
						aria-label={t('STANDARD_ASSISTANT_WIDTH')}
					>
						<Minimize2 className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => chatPanel.resizePanel(CHAT_PANEL_CONSTRAINTS.maxSize)}
						className="border-t p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
						title={t('EXPAND_ASSISTANT')}
						aria-label={t('EXPAND_ASSISTANT')}
					>
						<Maximize2 className="h-4 w-4" />
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={chatPanel.openPanel}
					className="absolute left-0 top-1/2 z-[1030] flex -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 bg-background p-3 text-primary shadow-lg transition-colors hover:bg-muted dark:text-primary-light"
					title={t('OPEN_ASSISTANT')}
					aria-label={t('OPEN_ASSISTANT')}
				>
					<Bot className="h-5 w-5" />
				</button>
			)}
		</div>
	);
}
