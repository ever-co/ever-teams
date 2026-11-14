'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { TTwoFactorSignIn } from '@/core/hooks/auth/use-two-factor-sign-in';
import {
	TWO_FACTOR_CODE_LENGTH,
	authenticatorCodeOf,
	isAuthenticatorCode,
	isRecoveryCode,
	recoveryCodeOf,
	type TwoFactorSignInFailure
} from '@/core/lib/auth/two-factor';
import type { AuthCodeRef } from '@/core/components/auth/auth-code-input';
import { Button } from '@/core/components/common/button';
import { ArrowLeft, Key, ShieldCheck } from '@/core/components/icons';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthCodeField, type AuthCodeStatus } from '@/core/components/auth/kit/auth-code-field';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { cn } from '@/core/lib/helpers';

type TwoFactorStepProps = {
	twoFactor: TTwoFactorSignIn;
	email: string;
	/** Back to the first step of the sign-in (another account, or a sign-in that waited too long). */
	onRestart: () => void;
};

type LocalProblem = 'incomplete' | null;

function renderAddress(chunks: ReactNode) {
	return <span className="font-medium break-all text-foreground">{chunks}</span>;
}

function failureMessageOf(
	t: ReturnType<typeof useTranslations>,
	failure: TwoFactorSignInFailure | null,
	usesRecoveryCode: boolean
): string | null {
	if (!failure) {
		return null;
	}
	if (failure.kind === 'wrong-code') {
		return usesRecoveryCode ? t('auth.twoFactor.WRONG_RECOVERY_CODE') : t('auth.twoFactor.WRONG_CODE');
	}
	if (failure.kind === 'too-many') {
		if (failure.minutes === null) {
			return t('auth.twoFactor.TOO_MANY_LATER');
		}
		return t('auth.twoFactor.TOO_MANY', { minutes: failure.minutes });
	}
	if (failure.kind === 'expired') {
		return t('auth.twoFactor.EXPIRED');
	}
	return t('auth.twoFactor.FAILED');
}

function codeStatusOf(isBusy: boolean, hasError: boolean): AuthCodeStatus {
	if (isBusy) {
		return 'loading';
	}
	if (hasError) {
		return 'error';
	}
	return 'idle';
}

/**
 * The second step of a sign-in whose account turned two-factor authentication on: the 6-digit code of the
 * authenticator app, or one of the recovery codes. A wrong code keeps the step open; a sign-in that waited too long
 * starts again.
 */
export function TwoFactorStep({ twoFactor, email, onRestart }: Readonly<TwoFactorStepProps>) {
	const t = useTranslations();
	const codeRef = useRef<AuthCodeRef | null>(null);
	const [usesRecoveryCode, setUsesRecoveryCode] = useState(false);
	// A ref: the field submits a full code before React stores its last digit
	const codeValue = useRef('');
	const [recoveryCode, setRecoveryCode] = useState('');
	const [localProblem, setLocalProblem] = useState<LocalProblem>(null);
	const { failure, verifying, signedIn } = twoFactor;
	const isBusy = verifying || signedIn;
	const hasExpired = failure?.kind === 'expired';

	const verify = async () => {
		if (isBusy) {
			return;
		}
		const proof = usesRecoveryCode
			? { recoveryCode: recoveryCodeOf(recoveryCode) }
			: { code: authenticatorCodeOf(codeValue.current) };
		const isComplete = usesRecoveryCode
			? isRecoveryCode(proof.recoveryCode ?? '')
			: isAuthenticatorCode(proof.code ?? '');
		if (!isComplete) {
			setLocalProblem('incomplete');
			return;
		}
		setLocalProblem(null);
		const accepted = await twoFactor.verify(proof);
		if (!accepted && !usesRecoveryCode) {
			// A code from the app lasts 30 seconds: the slots empty for the next one
			codeRef.current?.clear();
			codeValue.current = '';
		}
	};

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (hasExpired) {
			onRestart();
			return;
		}
		void verify();
	};

	const switchProof = () => {
		setUsesRecoveryCode((current) => !current);
		setLocalProblem(null);
	};

	let error = failureMessageOf(t, failure, usesRecoveryCode);
	if (localProblem === 'incomplete') {
		error = usesRecoveryCode
			? t('auth.twoFactor.RECOVERY_INCOMPLETE')
			: t('auth.twoFactor.CODE_INCOMPLETE', { length: TWO_FACTOR_CODE_LENGTH });
	}

	let description: ReactNode = t.rich('auth.twoFactor.DESCRIPTION', {
		length: TWO_FACTOR_CODE_LENGTH,
		email,
		address: renderAddress
	});
	if (usesRecoveryCode) {
		description = t('auth.twoFactor.RECOVERY_DESCRIPTION');
	}

	let submitLabel = t('auth.twoFactor.SUBMIT');
	if (hasExpired) {
		submitLabel = t('auth.twoFactor.SIGN_IN_AGAIN');
	}

	return (
		<div className="flex flex-col">
			<button type="button" onClick={onRestart} className={cn(AUTH_QUIET_LINK, 'self-start')}>
				<ArrowLeft aria-hidden="true" />
				{t('auth.twoFactor.BACK')}
			</button>
			<AuthHeading
				mark={<AuthMark>{usesRecoveryCode ? <Key /> : <ShieldCheck />}</AuthMark>}
				title={t('auth.twoFactor.TITLE')}
				description={description}
				className="mt-6 mb-7"
			/>
			<form className="flex flex-col gap-5" onSubmit={submit} autoComplete="off" noValidate>
				{usesRecoveryCode ? (
					<AuthField
						id="two-factor-recovery-code"
						name="recoveryCode"
						label={t('auth.twoFactor.RECOVERY_LABEL')}
						placeholder="XXXX-XXXX-XXXX-XXXX"
						icon={<Key />}
						value={recoveryCode}
						onChange={(event) => setRecoveryCode(recoveryCodeOf(event.target.value))}
						error={error}
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						inputClassName="font-mono tracking-wider"
						autoFocus
					/>
				) : (
					<AuthCodeField
						id="two-factor-code"
						label={t('auth.twoFactor.CODE_LABEL')}
						length={TWO_FACTOR_CODE_LENGTH}
						allowedCharacters="numeric"
						status={codeStatusOf(isBusy, Boolean(error))}
						error={error}
						codeRef={codeRef}
						onChange={(value) => {
							codeValue.current = value;
							setLocalProblem(null);
							// Six digits are the whole code: it goes at once, as a code from the e-mailed link does
							if (isAuthenticatorCode(value)) {
								void verify();
							}
						}}
					/>
				)}

				<Button type="submit" loading={isBusy} disabled={isBusy} className="w-full max-sm:h-11">
					{submitLabel}
				</Button>
			</form>
			<button type="button" onClick={switchProof} className={cn(AUTH_QUIET_LINK, 'mt-5 self-center')}>
				{usesRecoveryCode ? t('auth.twoFactor.USE_APP') : t('auth.twoFactor.USE_RECOVERY')}
			</button>
		</div>
	);
}
