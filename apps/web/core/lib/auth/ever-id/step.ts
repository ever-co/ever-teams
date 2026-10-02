/**
 * The step marker of an Ever ID sign-in that continues on another page of this app: `?ever_id=confirm` on the
 * passcode page (Gauzy's one-time e-mail code before an existing account is linked) and `?ever_id=signup` on the
 * sign-up page (the confirmation of a new workspace).
 *
 * It only says which step to show. The one-time key of the step never goes into a URL (analytics, logs and
 * Referer headers all see URLs): it travels in an httpOnly cookie that the page's scripts cannot read
 * (core/lib/auth/ever-id/handoff.ts, server side).
 */

/** The query parameter of the marker. */
export const EVER_ID_STEP_PARAM = 'ever_id';

export type EverIdStep = 'confirm' | 'signup';

const STEP_PAGES: Record<EverIdStep, string> = {
	confirm: '/auth/passcode',
	signup: '/auth/signup'
};

/** Whether a marker value names `step`. */
export function isEverIdStep(value: string | null | undefined, step: EverIdStep): boolean {
	return value === step;
}

/** The same-origin path of a step, e.g. `/auth/passcode?ever_id=confirm`: the marker and nothing else. */
export function everIdStepPath(step: EverIdStep): string {
	return `${STEP_PAGES[step]}?${EVER_ID_STEP_PARAM}=${step}`;
}
