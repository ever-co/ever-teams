import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { installFakeChrome, installFakeFetch } from '../test/fake-chrome.ts';
import { ApiError } from './api-client.ts';
import { runPopupAction } from './popup-action.ts';
import type { Refusal } from './refusal.ts';
import { stopThroughBackground } from './stop-run.ts';
import type { Session } from './workspaces.ts';

const SESSION: Session = {
	apiUrl: 'https://api.example.test',
	token: 'access-1',
	refreshToken: 'refresh-1',
	userId: 'user-1',
	email: 'marie@example.test',
	name: 'Marie Curie',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	employeeId: 'employee-1',
	teams: [],
	teamId: 'team-1'
};

const RUN = { id: 'log-1', source: 'BROWSER_EXTENSION' };

type Shown = { busy: boolean } | { refusal: Refusal | null } | 'read';

/** The popup as an action changes it: what it showed, in order. The read after the action answers `read`. */
function popupView(read: () => Promise<unknown> = async () => null) {
	const shown: Shown[] = [];
	const view = {
		setBusy: (busy: boolean) => {
			shown.push({ busy });
		},
		setRefusal: (refusal: Refusal | null) => {
			shown.push({ refusal });
		},
		refresh: () => {
			shown.push('read');
			return read();
		}
	};
	return { shown, view };
}

/** The background as the popup reaches it: what it answers the stop. */
function backgroundAnswering(answer: unknown) {
	const chromeLike = (globalThis as unknown as { chrome: Record<string, unknown> }).chrome;
	chromeLike.runtime = { sendMessage: async () => answer };
}

describe("the popup's start or stop", () => {
	let calls: ReturnType<typeof installFakeFetch>;

	beforeEach(() => {
		installFakeChrome({ session: SESSION });
		calls = installFakeFetch(() => ({ status: 200, body: {} }));
	});

	it('shows the generic notice when the background could not stop the run for a reason not from the API', async () => {
		backgroundAnswering({ stopped: false });
		const popup = popupView();

		await runPopupAction(() => stopThroughBackground(SESSION, RUN), popup.view);

		assert.deepEqual(popup.shown, [
			{ busy: true },
			{ refusal: null },
			{ refusal: { key: 'errorGeneric' } },
			'read',
			{ busy: false }
		]);
		assert.equal(calls.length, 0, 'the background answered: the popup does not stop the run itself');
	});

	it("shows the API's reason of a stop the background answered refused", async () => {
		backgroundAnswering({ stopped: false, failure: { status: 409, message: 'Another run is going on' } });
		const popup = popupView();

		await runPopupAction(() => stopThroughBackground(SESSION, RUN), popup.view);

		assert.deepEqual(popup.shown, [
			{ busy: true },
			{ refusal: null },
			{ refusal: { key: 'errorTimerChangedElsewhere' } },
			'read',
			{ busy: false }
		]);
	});

	it('clears the last notice and reads the timer again after a stop that passed', async () => {
		backgroundAnswering({ stopped: true });
		const popup = popupView();

		await runPopupAction(() => stopThroughBackground(SESSION, RUN), popup.view);

		assert.deepEqual(popup.shown, [{ busy: true }, { refusal: null }, 'read', { busy: false }]);
	});

	it('never rejects, and unlocks the buttons, when the read after it fails', async () => {
		const readFailure = new ApiError(0, 'offline');
		const popup = popupView(async () => {
			throw readFailure;
		});
		const warn = mock.method(console, 'warn', () => undefined);
		try {
			await runPopupAction(async () => {
				throw new Error('The run could not be stopped');
			}, popup.view);
		} finally {
			warn.mock.restore();
		}

		assert.deepEqual(popup.shown.at(-1), { busy: false });
		assert.deepEqual(popup.shown[2], { refusal: { key: 'errorGeneric' } });
		// The read's failure is not lost: it is told on the console
		assert.equal(warn.mock.callCount(), 1);
		assert.equal(warn.mock.calls[0].arguments[1], readFailure);
	});
});
