'use client';
import { IAuthLogin, IServerError } from '@ever-teams/toolkit-types';
import { useRef, useState } from 'react';
import { authVerifyTwoFactor } from '@ever-teams/api';
import type { IApiRequestConfig } from '@ever-teams/api';
import { useTranslation } from 'react-i18next';
import { gotNoAnswer, kindOfFailedRequest, SIGN_IN_ERROR_MESSAGE_KEYS } from '@lib/errors/kit-error';
import {
	authenticatorCodeOf,
	isCompleteTwoFactorCode,
	recoveryCodeOf,
	TWO_FACTOR_CODE_LENGTH,
	twoFactorFailureOf,
	type TwoFactorChallenge,
	type TwoFactorFailure
} from '@lib/errors/two-factor';
import { apiUrlOf } from '@lib/utils/api-url';

const FAILURE_MESSAGE_KEYS = {
	'wrong-code': 'AUTH.two_factor_wrong_code',
	expired: 'AUTH.two_factor_expired',
	'too-many': 'AUTH.two_factor_too_many',
	failed: 'AUTH.two_factor_failed'
} as const satisfies Record<TwoFactorFailure, string>;

// What the verify request sends: the authenticator app's code, or a recovery code.
function proofOf(code: string, usesRecoveryCode: boolean): { code: string } | { recoveryCode: string } {
	if (usesRecoveryCode) {
		return { recoveryCode: code };
	}
	return { code };
}

/** The code step of a sign-in the API asked a two-factor code for: what the form shows and what it does. */
export interface TwoFactorStep {
	code: string;
	usesRecoveryCode: boolean;
	loading: boolean;
	error?: string;
	/** Whether the error keeps the button off until the code changes: a refused code, not a failure to try again. */
	blocksSubmit: boolean;
	codeLength: number;
	handleCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleCodeSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
	toggleRecoveryCode: () => void;
}

interface UseTwoFactorStepParams {
	api?: IApiRequestConfig;
	onSignedIn: (session: IAuthLogin) => void;
}

/**
 * The code step of the kit's password sign-in, for an account with two-factor sign-in on (ever-co/ever-teams#5701):
 * `open` it with the challenge the sign-in answered, and the code of the authenticator app, or a recovery code,
 * completes the sign-in through `authVerifyTwoFactor`.
 */
export function useTwoFactorStep({ api, onSignedIn }: UseTwoFactorStepParams) {
	const { t } = useTranslation();
	const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
	const [code, setCode] = useState('');
	const [usesRecoveryCode, setUsesRecoveryCode] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [retryable, setRetryable] = useState(false);
	// Counts the edits: a failure that comes back after an edit is not shown, as in the password step.
	const edits = useRef(0);
	// Counts the steps opened and closed: the answer of a step left meanwhile (Back, a new sign-in) is dropped.
	const steps = useRef(0);

	const open = (next: TwoFactorChallenge) => {
		steps.current += 1;
		setChallenge(next);
		setCode('');
		setUsesRecoveryCode(false);
		setError(undefined);
		setLoading(false);
	};

	const close = () => {
		steps.current += 1;
		setChallenge(null);
		setCode('');
		setError(undefined);
		setLoading(false);
	};

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		edits.current += 1;
		setError(undefined);
		if (usesRecoveryCode) {
			setCode(recoveryCodeOf(e.target.value));
			return;
		}
		setCode(authenticatorCodeOf(e.target.value));
	};

	const toggleRecoveryCode = () => {
		edits.current += 1;
		setUsesRecoveryCode((uses) => !uses);
		setCode('');
		setError(undefined);
	};

	const incompleteMessage = () => {
		if (usesRecoveryCode) {
			return t('AUTH.two_factor_recovery_incomplete');
		}
		return t('AUTH.two_factor_code_incomplete', { length: TWO_FACTOR_CODE_LENGTH });
	};

	// The message of a failed check, and whether the same code may be sent again (no answer, a server failure).
	const failureOf = async (answer: IServerError): Promise<{ message: string; retryable: boolean }> => {
		if (gotNoAnswer(answer)) {
			const kind = await kindOfFailedRequest(apiUrlOf(api));
			return { message: t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]), retryable: true };
		}
		const failure = twoFactorFailureOf(answer, challenge?.expiresAt ?? '', Date.now());
		const retryable = failure === 'failed';
		const isWrongRecoveryCode = failure === 'wrong-code' && usesRecoveryCode;
		if (isWrongRecoveryCode) {
			return { message: t('AUTH.two_factor_wrong_recovery_code'), retryable };
		}
		return { message: t(FAILURE_MESSAGE_KEYS[failure]), retryable };
	};

	const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!challenge) {
			return;
		}
		if (!isCompleteTwoFactorCode(code, usesRecoveryCode)) {
			setError(incompleteMessage());
			setRetryable(false);
			return;
		}
		const editsAtSubmit = edits.current;
		const stepAtSubmit = steps.current;
		setLoading(true);
		setError(undefined);
		const proof = proofOf(code, usesRecoveryCode);
		const answer = await authVerifyTwoFactor({ challenge: challenge.challenge, ...proof }, api);
		const isStepLeft = steps.current !== stepAtSubmit;
		if (isStepLeft) {
			return;
		}
		const isSession = 'token' in answer;
		if (isSession) {
			close();
			onSignedIn(answer);
			return;
		}
		const failure = await failureOf(answer);
		const isStillShown = steps.current === stepAtSubmit && edits.current === editsAtSubmit;
		if (isStillShown) {
			setError(failure.message);
			setRetryable(failure.retryable);
		}
		setLoading(false);
	};

	if (!challenge) {
		return { step: null, open, close };
	}
	const step: TwoFactorStep = {
		code,
		usesRecoveryCode,
		loading,
		error,
		blocksSubmit: Boolean(error) && !retryable,
		codeLength: TWO_FACTOR_CODE_LENGTH,
		handleCodeChange,
		handleCodeSubmit,
		toggleRecoveryCode
	};
	return { step, open, close };
}
