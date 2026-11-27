'use client';

import { useCallback, useId, useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useSidebar } from '@/core/components/common/sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/core/components/common/sheet';
import { isPathActive } from '@/core/lib/utils/navigation-path';
import { useHiddenChatwootBubble } from '@/core/components/integration/chatwoot/use-hidden-chatwoot-bubble';
import { EVER_SI_PANEL_ID, EVER_SI_PATH, everSiPanelOpenAtom, everSiPanelWidthAtom } from './atoms/ever-si-panel.atom';
import { EVER_SI_PANEL_WIDTH, clampEverSiPanelWidth, maxEverSiPanelWidth } from './ever-si-panel-width';
import { EverSiResizeHandle } from './components/ever-si-resize-handle';
import { useEverSiScopeWatcher } from './hooks/use-ever-si-scope-watcher';

/** The chat, its markdown and the AI SDK load the first time the panel opens, not with every page. */
const EverSiPanelBody = dynamic(
	() => import('./components/ever-si-panel-body').then((mod) => ({ default: mod.EverSiPanelBody })),
	{ ssr: false }
);

const PANEL_TITLE_RECIPE = 'truncate text-sm font-medium text-foreground';

function subscribeToResize(onChange: () => void) {
	window.addEventListener('resize', onChange);
	return () => window.removeEventListener('resize', onChange);
}

function readViewportWidth() {
	return window.innerWidth;
}

function readServerViewportWidth() {
	return EVER_SI_PANEL_WIDTH.max * 2;
}

function useViewportWidth() {
	return useSyncExternalStore(subscribeToResize, readViewportWidth, readServerViewportWidth);
}

type EverSiSurfaceProps = { onClose: () => void };

/**
 * Desktop: a rounded panel of its own between the sidebar and the page, with the page's surface, radius and
 * hairline (`SidebarInset`), resizable from its edge and remembered per browser.
 */
export function EverSiDesktopPanel({ onClose }: Readonly<EverSiSurfaceProps>) {
	const t = useTranslations();
	const titleId = useId();
	const viewportWidth = useViewportWidth();
	const [storedWidth, setStoredWidth] = useAtom(everSiPanelWidthAtom);
	const [dragWidth, setDragWidth] = useState<number | null>(null);
	const maxWidth = maxEverSiPanelWidth(viewportWidth);
	const width = clampEverSiPanelWidth(dragWidth ?? storedWidth, viewportWidth);

	const commitWidth = useCallback(
		(next: number) => {
			setDragWidth(null);
			setStoredWidth(clampEverSiPanelWidth(next, viewportWidth));
		},
		[setStoredWidth, viewportWidth]
	);

	const resetWidth = useCallback(() => {
		setDragWidth(null);
		setStoredWidth(EVER_SI_PANEL_WIDTH.default);
	}, [setStoredWidth]);

	// The same element on every render, so a drag only changes the panel's width and never re-renders the chat.
	const body = useMemo(
		() => (
			<EverSiPanelBody
				title={
					<h2 id={titleId} className={PANEL_TITLE_RECIPE}>
						{t('chatView.ASSISTANT')}
					</h2>
				}
				onClose={onClose}
			/>
		),
		[onClose, t, titleId]
	);

	return (
		<div className="relative hidden h-dvh shrink-0 py-2 pe-2 md:flex">
			<aside
				id={EVER_SI_PANEL_ID}
				aria-labelledby={titleId}
				style={{ width }}
				className="flex h-full min-w-0 flex-col overflow-clip rounded-xl bg-background text-foreground hairline-ring ring-border shadow-[0_1px_3px_rgb(0_0_0/0.04)]"
			>
				{body}
			</aside>
			<EverSiResizeHandle
				width={width}
				maxWidth={maxWidth}
				onPreview={setDragWidth}
				onCommit={commitWidth}
				onReset={resetWidth}
			/>
		</div>
	);
}

/** Phones: Ever SI takes the whole screen, over the page, with its own close button. */
function EverSiMobileLayer({ onClose }: Readonly<EverSiSurfaceProps>) {
	const t = useTranslations();
	// The support bubble would sit on the composer's send button while Ever SI takes the whole screen.
	useHiddenChatwootBubble(true);
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				onClose();
			}
		},
		[onClose]
	);

	return (
		<Sheet open onOpenChange={handleOpenChange}>
			<SheetContent
				id={EVER_SI_PANEL_ID}
				side="left"
				showCloseButton={false}
				className="w-full gap-0 overflow-hidden bg-background p-0 sm:max-w-none"
			>
				<EverSiPanelBody
					title={<SheetTitle className={PANEL_TITLE_RECIPE}>{t('chatView.ASSISTANT')}</SheetTitle>}
					onClose={onClose}
				/>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Ever SI beside every page of the shell (spec A7), opened and closed from its sidebar row. It is not shown on
 * `/assistant`, where the page is Ever SI, nor to the visitors of a public team page, who have no conversation to keep.
 */
export function EverSiPanel({ publicTeam = false }: Readonly<{ publicTeam?: boolean }>) {
	// Mounted in both shells whether the panel is open or not: the one place that sees every change of scope.
	useEverSiScopeWatcher();
	const pathname = usePathname();
	const { isMobile } = useSidebar();
	const [isOpen, setIsOpen] = useAtom(everSiPanelOpenAtom);
	const close = useCallback(() => setIsOpen(false), [setIsOpen]);

	const isOnFullPage = isPathActive(pathname, EVER_SI_PATH);
	if (publicTeam || !isOpen || isOnFullPage) {
		return null;
	}
	if (isMobile) {
		return <EverSiMobileLayer onClose={close} />;
	}
	return <EverSiDesktopPanel onClose={close} />;
}
