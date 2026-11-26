'use client';

import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useSidebar } from '@/core/components/common/sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/core/components/common/sheet';
import {
	EVER_SI_OPEN_BUTTON_ID,
	EVER_SI_PANEL_ID,
	everSiPanelOpenAtom,
	everSiPanelWidthAtom,
	everSiReturnPathAtom
} from './atoms/ever-si-panel.atom';
import { currentPagePath, everSiPanelModeOf, focusElementSoon, isDesktopViewport } from './ever-si-panel-mode';
import { EVER_SI_PANEL_WIDTH, clampEverSiPanelWidth, maxEverSiPanelWidth } from './ever-si-panel-width';
import { EverSiCollapseButton, EverSiExpandLink } from './components/ever-si-edge-controls';
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
 * hairline (`SidebarInset`), resizable from its edge and remembered per browser. The edge carries the panel's three
 * controls, as in Ever Works: collapse to the sidebar's button, the grip, and on to the full page.
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
			{/* Focusable from code only: the sidebar's button hands the focus over when it opens the panel. */}
			<aside
				id={EVER_SI_PANEL_ID}
				aria-labelledby={titleId}
				tabIndex={-1}
				style={{ width }}
				className="flex h-full min-w-0 flex-col overflow-clip rounded-xl bg-background text-foreground hairline-ring ring-border shadow-[0_1px_3px_rgb(0_0_0/0.04)] outline-none focus-visible:ring-ring"
			>
				{body}
			</aside>
			{/* In reading order down the edge: collapse, grip, full page. */}
			<EverSiCollapseButton onCollapse={onClose} />
			<EverSiResizeHandle
				width={width}
				maxWidth={maxWidth}
				onPreview={setDragWidth}
				onCommit={commitWidth}
				onReset={resetWidth}
			/>
			<EverSiExpandLink />
		</div>
	);
}

/** Phones: Ever SI takes the whole screen, over the page, with its own close button. */
function EverSiMobileLayer({ onClose }: Readonly<EverSiSurfaceProps>) {
	const t = useTranslations();
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
					// The sheet would come back over the next page, so going to the full page closes it.
					onOpenFullPage={onClose}
				/>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Ever SI beside every page of the shell (spec A7). On desktop it has three sizes (`everSiPanelModeOf`): collapsed to
 * the button on the sidebar's edge, docked here as a resizable panel, or expanded to the `/assistant` page, where
 * this panel is not shown because the page is Ever SI. It is never shown to the visitors of a public team page, who
 * have no conversation to keep.
 */
export function EverSiPanel({ publicTeam = false }: Readonly<{ publicTeam?: boolean }>) {
	// Mounted in both shells whether the panel is open or not: the one place that sees every change of scope.
	useEverSiScopeWatcher();
	const pathname = usePathname();
	// The query as well as the path: a filter or a tab changes the page the person is on without changing its path.
	const query = useSearchParams()?.toString() ?? '';
	const { isMobile } = useSidebar();
	const [isOpen, setIsOpen] = useAtom(everSiPanelOpenAtom);
	const setReturnPath = useSetAtom(everSiReturnPathAtom);
	const mode = everSiPanelModeOf(pathname, isOpen);
	const isOnFullPage = mode === 'expanded';

	const close = useCallback(() => setIsOpen(false), [setIsOpen]);
	// Desktop: the panel leaves for its button on the sidebar's edge, and the keyboard focus goes there with it.
	const collapse = useCallback(() => {
		setIsOpen(false);
		focusElementSoon(EVER_SI_OPEN_BUTTON_ID);
	}, [setIsOpen]);

	// Every page that is not the full page is where its "show beside the page" control leads back to, with the
	// query it has now, however the person then reaches the full page (the edge, the header's link, the command
	// palette, a bookmark).
	useEffect(() => {
		if (!isOnFullPage) {
			setReturnPath(currentPagePath());
		}
	}, [isOnFullPage, pathname, query, setReturnPath]);

	// The full page is Ever SI at its widest, so leaving it is one step down, to the panel beside the next page,
	// however the person came. Not on phones, where the panel is a sheet that would cover that page; the window is
	// measured here because the sidebar's own `isMobile` is not known yet on the first render.
	useEffect(() => {
		if (isOnFullPage && !publicTeam && isDesktopViewport()) {
			setIsOpen(true);
		}
	}, [isOnFullPage, publicTeam, setIsOpen]);

	if (publicTeam || mode !== 'docked') {
		return null;
	}
	if (isMobile) {
		return <EverSiMobileLayer onClose={close} />;
	}
	return <EverSiDesktopPanel onClose={collapse} />;
}
