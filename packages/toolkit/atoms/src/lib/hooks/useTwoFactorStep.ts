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
	// Counts the edits: a failure that comes back after an edit is not shown, as in the password step.
	const edits = useRef(0);

	const open = (next: TwoFactorChallenge) => {
		setChallenge(next);
		setCode('');
		setUsesRecoveryCode(false);
		setError(undefined);
	};

	const close = () => {
		setChallenge(null);
		setCode('');
		setError(undefined);
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

	const failureMessage = async (answer: IServerError) => {
		if (gotNoAnswer(answer)) {
			const kind = await kindOfFailedRequest(apiUrlOf(api));
			return t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]);
		}
		const failure = twoFactorFailureOf(answer, challenge?.expiresAt ?? '', Date.now());
		const isWrongRecoveryCode = failure === 'wrong-code' && usesRecoveryCode;
		if (isWrongRecoveryCode) {
			return t('AUTH.two_factor_wrong_recovery_code');
		}
		return t(FAILURE_MESSAGE_KEYS[failure]);
	};

	const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!challenge) {
			return;
		}
		if (!isCompleteTwoFactorCode(code, usesRecoveryCode)) {
			setError(incompleteMessage());
			return;
		}
		const editsAtSubmit = edits.current;
		setLoading(true);
		setError(undefined);
		const proof = proofOf(code, usesRecoveryCode);
		const answer = await authVerifyTwoFactor({ challenge: challenge.challenge, ...proof }, api);
		const isSession = 'token' in answer;
		if (isSession) {
			setLoading(false);
			close();
			onSignedIn(answer);
			return;
		}
		const message = await failureMessage(answer);
		if (edits.current === editsAtSubmit) {
			setError(message);
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
		codeLength: TWO_FACTOR_CODE_LENGTH,
		handleCodeChange,
		handleCodeSubmit,
		toggleRecoveryCode
	};
	return { step, open, close };
}
