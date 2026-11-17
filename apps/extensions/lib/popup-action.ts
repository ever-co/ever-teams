import { ApiError } from '~lib/api-client';
import { refusalOf, type Refusal } from '~lib/refusal';

/** The notice of a failed start or stop: the API's reason, or the generic one for a failure that is not the API's. */
export function refusalFrom(error: unknown): Refusal {
	if (error instanceof ApiError) {
		return refusalOf(error);
	}
	return { key: 'errorGeneric' };
}

/** What a start or a stop changes in the popup: its buttons locked meanwhile, its notice, and the timer it reads. */
export interface PopupActionView {
	setBusy: (busy: boolean) => void;
	setRefusal: (refusal: Refusal | null) => void;
	refresh: () => Promise<unknown>;
}

/**
 * Runs a start or a stop pressed in the popup. A failure shows as the popup's notice: the API's reason, or the generic
 * one (a stop the background could not make for a reason not from the API: stop-run.ts). The timer is read again
 * either way, so the popup shows whether the run started or stopped.
 *
 * Never rejects: the popup runs it from a click and nothing awaits it. A read that fails shows its own notice
 * (useTimerStatus), and the buttons unlock all the same.
 */
export async function runPopupAction(work: () => Promise<void>, view: PopupActionView): Promise<void> {
	view.setBusy(true);
	view.setRefusal(null);
	try {
		await work();
	} catch (error) {
		view.setRefusal(refusalFrom(error));
	}
	try {
		await view.refresh();
	} catch (error) {
		console.warn('Ever Teams: the timer could not be read after a start or a stop.', error);
	} finally {
		view.setBusy(false);
	}
}
