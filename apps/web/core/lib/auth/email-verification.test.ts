/**
 * The app's e-mail verification rule (ever-co/ever-teams#5677): an unverified address holds the person back only on a
 * deployment that verifies addresses, and the app asks for a code only once the API confirmed it verifies them.
 */
import {
	asksForEmailVerification,
	isEmailVerificationSatisfied,
	wasVerificationEmailSent,
	type EmailVerificationState
} from './email-verification';

const VERIFIED = { isEmailVerified: true };
const UNVERIFIED = { isEmailVerified: false };
const SWITCHED_OFF: EmailVerificationState = null;
const NOT_KNOWN: EmailVerificationState = undefined;
const PENDING_AFTER_SEND: EmailVerificationState = { isEmailVerified: false, verificationEmailSent: true };
const PENDING_NEVER_SENT: EmailVerificationState = { isEmailVerified: false, verificationEmailSent: false };

describe('isEmailVerificationSatisfied', () => {
	it('lets a verified address through on any deployment', () => {
		expect(isEmailVerificationSatisfied(VERIFIED, NOT_KNOWN)).toBe(true);
		expect(isEmailVerificationSatisfied(VERIFIED, PENDING_AFTER_SEND)).toBe(true);
		expect(isEmailVerificationSatisfied(VERIFIED, SWITCHED_OFF)).toBe(true);
	});

	it('lets an unverified address through where the deployment verifies no address', () => {
		expect(isEmailVerificationSatisfied(UNVERIFIED, SWITCHED_OFF)).toBe(true);
	});

	it('holds an unverified address back where the deployment verifies addresses', () => {
		expect(isEmailVerificationSatisfied(UNVERIFIED, PENDING_AFTER_SEND)).toBe(false);
		expect(isEmailVerificationSatisfied(UNVERIFIED, PENDING_NEVER_SENT)).toBe(false);
	});

	it('holds an unverified address back until the API has answered', () => {
		expect(isEmailVerificationSatisfied(UNVERIFIED, NOT_KNOWN)).toBe(false);
	});

	it('lets nobody through before the user is known', () => {
		expect(isEmailVerificationSatisfied(null, SWITCHED_OFF)).toBe(false);
		expect(isEmailVerificationSatisfied(undefined, SWITCHED_OFF)).toBe(false);
	});
});

describe('asksForEmailVerification', () => {
	it('asks once the API confirmed the address still has to be verified', () => {
		expect(asksForEmailVerification(UNVERIFIED, PENDING_AFTER_SEND)).toBe(true);
		expect(asksForEmailVerification(UNVERIFIED, PENDING_NEVER_SENT)).toBe(true);
	});

	it('asks nothing where the deployment verifies no address', () => {
		expect(asksForEmailVerification(UNVERIFIED, SWITCHED_OFF)).toBe(false);
	});

	it('asks nothing before the API has answered', () => {
		expect(asksForEmailVerification(UNVERIFIED, NOT_KNOWN)).toBe(false);
	});

	it('asks nothing of a verified address, nor once the API says it was verified meanwhile', () => {
		expect(asksForEmailVerification(VERIFIED, PENDING_AFTER_SEND)).toBe(false);
		const verifiedMeanwhile = { isEmailVerified: true, verificationEmailSent: false };
		expect(asksForEmailVerification(UNVERIFIED, verifiedMeanwhile)).toBe(false);
		expect(asksForEmailVerification(null, PENDING_AFTER_SEND)).toBe(false);
	});
});

describe('wasVerificationEmailSent', () => {
	it('says a code went out only when the API says a valid one did', () => {
		expect(wasVerificationEmailSent(PENDING_AFTER_SEND)).toBe(true);
		expect(wasVerificationEmailSent(PENDING_NEVER_SENT)).toBe(false);
		expect(wasVerificationEmailSent({ isEmailVerified: false })).toBe(false);
		expect(wasVerificationEmailSent(SWITCHED_OFF)).toBe(false);
		expect(wasVerificationEmailSent(NOT_KNOWN)).toBe(false);
	});
});
