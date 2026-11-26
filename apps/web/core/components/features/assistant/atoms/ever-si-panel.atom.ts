import { atomWithStorage } from 'jotai/utils';
import { EVER_SI_PANEL_WIDTH } from '../ever-si-panel-width';

/** The full-page view of Ever SI; the panel is not shown there, the page is Ever SI. */
export const EVER_SI_PATH = '/assistant';

/** The id of the panel, for the sidebar row's `aria-controls`. */
export const EVER_SI_PANEL_ID = 'ever-si-panel';

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
