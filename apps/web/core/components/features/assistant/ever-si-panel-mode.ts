import { isPathActive } from '@/core/lib/utils/navigation-path';
import { EVER_SI_PATH } from './atoms/ever-si-panel.atom';

/**
 * The three sizes of Ever SI on a desktop screen, smallest first:
 * - `collapsed`: only its button on the sidebar's edge;
 * - `docked`: a resizable panel between the sidebar and the page;
 * - `expanded`: the full page (`/assistant`), where the page is Ever SI.
 */
type EverSiPanelMode = 'collapsed' | 'docked' | 'expanded';

/** The size Ever SI has on this page: the full page wins, then the remembered open state of the panel. */
export function everSiPanelModeOf(pathname: string | null | undefined, isOpen: boolean): EverSiPanelMode {
	if (isPathActive(pathname, EVER_SI_PATH)) {
		return 'expanded';
	}
	if (isOpen) {
		return 'docked';
	}
	return 'collapsed';
}

/** The page the browser is on, with its query, as the place to come back to from the full page. */
export function currentPagePath() {
	return `${window.location.pathname}${window.location.search}`;
}

/**
 * Moves the keyboard focus to an element that the click being handled is about to put on the page (the panel, or
 * the button that reopens it), so the focus does not fall back to the top of the document when its button goes.
 */
export function focusElementSoon(id: string) {
	requestAnimationFrame(() => {
		document.getElementById(id)?.focus({ preventScroll: true });
	});
}
