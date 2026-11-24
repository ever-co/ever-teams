/**
 * The global setup of a live run nobody asked for (playwright.live.config.ts without E2E_LIVE=1): it stops the run
 * before any test, so nothing reaches the shared demo API.
 */
export default function refuseLiveRun(): never {
	throw new Error(
		'The live suite talks to the shared demo API and asks it to send e-mails. Run it on purpose: E2E_LIVE=1 yarn workspace @ever-teams/web pw:live'
	);
}
