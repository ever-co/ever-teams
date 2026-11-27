import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { EVER_SI_PANEL_WIDTH } from '../ever-si-panel-width';

/** The full-page view of Ever SI; the panel is not shown there, the page is Ever SI. */
export const EVER_SI_PATH = '/assistant';

/** The id of the panel, for the `aria-controls` of the buttons that open and close it. */
export const EVER_SI_PANEL_ID = 'ever-si-panel';

/** The id of the button on the sidebar's edge that opens the panel; focus goes back to it when the panel closes. */
export const EVER_SI_OPEN_BUTTON_ID = 'ever-si-open-button';

/** Where "show beside the page" leads from the full page when nobody came from another page. */
export const EVER_SI_DEFAULT_RETURN_PATH = '/';

/**
 * The page Ever SI was widened from (path and query), for the full page's "show beside the page" control to go
 * back to. Kept for the visit only: after a reload the control leads home.
 */
export const everSiReturnPathAtom = atom<string | null>(null);

/**
 * Whether the Ever SI panel is open, remembered per browser. Read on the first render (the shell renders it on the
 * client only), so a panel left open is there from the first paint instead of flashing closed.
 */
export const everSiPanelOpenAtom = atomWithStorage<boolean>('ever-si-panel-open', false, undefined, {
	getOnInit: true
});

/** The width the person gave the panel, remembered per browser; clamped to the window where it is used. */
export const everSiPanelWidthAtom = atomWithStorage<number>(
	'ever-si-panel-width',
	EVER_SI_PANEL_WIDTH.default,
	undefined,
	{ getOnInit: true }
);
