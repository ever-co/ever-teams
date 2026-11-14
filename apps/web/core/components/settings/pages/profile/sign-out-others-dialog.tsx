'use client';

import { type FormEvent, useId, useState } from 'react';
import { toast } from 'sonner';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { LogOut, Shield, Spinner } from '@/core/components/icons';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import {
	type IUserSessionSignOutOthersInput,
	nextProofAfter,
	type TSessionProof,
	USER_SESSION_REFUSAL
} from '@/core/lib/auth/user-sessions';
import { errorReasonKeyOf, errorStatusOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';

type Translate = ReturnType<typeof useTranslations>;

const TOO_MANY_REQUESTS = 429;

type SignOutOthersDialogProps = {
	open: boolean;
	/** How many other sessions are listed. */
	count: number;
	/** Where the sign-in code e-mail goes: the account's own address. */
	email: string;
	onClose: () => void;
	/** Signs the other sessions out with the proof given; answers how many went. */
	onSignOut: (input: IUserSessionSignOutOthersInput) => Promise<number>;
	onSendCode: () => Promise<void>;
};

function reasonOf(failure: unknown, t: Translate): string {
	return t(errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths);
}

function wrongProofOf(proof: TSessionProof, t: Translate): string {
	if (proof === 'password') {
		return t('settings.sessions.WRONG_PASSWORD');
	}
	return t('settings.sessions.WRONG_CODE');
}

/** Why the other sessions are still signed in, in words the person can act on. */
function signOutFailureOf(failure: unknown, proof: TSessionProof, t: Translate): string {
	if (errorStatusOf(failure) === TOO_MANY_REQUESTS) {
		return t('settings.sessions.TOO_MANY_ATTEMPTS');
	}
	const code = gauzyErrorCodeOf(failure);
	if (code === USER_SESSION_REFUSAL.CONFIRMATION_INVALID) {
		return wrongProofOf(proof, t);
	}
	if (code === USER_SESSION_REFUSAL.CURRENT_UNKNOWN) {
		return t('settings.sessions.THIS_SESSION_UNKNOWN');
	}
	if (code === USER_SESSION_REFUSAL.SIGN_OUT_INCOMPLETE) {
		return t('settings.sessions.SIGN_OUT_INCOMPLETE');
	}
	return t('settings.sessions.SIGN_OUT_OTHERS_FAILED', { reason: reasonOf(failure, t) });
}

/** Why the dialog now asks for the other proof: Gauzy refused the kind sent for this account. */
function switchNoticeOf(next: TSessionProof, t: Translate): string {
	if (next === 'code') {
		return t('settings.sessions.NEEDS_CODE');
	}
	return t('settings.sessions.NEEDS_PASSWORD');
}

function otherProofOf(proof: TSessionProof): TSessionProof {
	if (proof === 'password') {
		return 'code';
	}
	return 'password';
}

type PasswordFieldProps = {
	fieldId: string;
	/** The id of the sentence that says why the last try failed, when there is one. */
	errorId?: string;
	value: string;
	onChange: (value: string) => void;
};

function PasswordField({ fieldId, errorId, value, onChange }: Readonly<PasswordFieldProps>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={fieldId} className="text-xs text-muted-foreground">
				{t('settings.sessions.PASSWORD_LABEL')}
			</label>
			<Input
				id={fieldId}
				type="password"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				autoComplete="current-password"
				aria-invalid={Boolean(errorId)}
				aria-describedby={errorId}
				className="h-8"
			/>
		</div>
	);
}

type CodeFieldProps = {
	fieldId: string;
	/** The id of the sentence that says why the last try failed, when there is one. */
	errorId?: string;
	email: string;
	value: string;
	isCodeSent: boolean;
	isSendingCode: boolean;
	onChange: (value: string) => void;
	onSendCode: () => void;
};

function CodeField({
	fieldId,
	errorId,
	email,
	value,
	isCodeSent,
	isSendingCode,
	onChange,
	onSendCode
}: Readonly<CodeFieldProps>) {
	const t = useTranslations();
	let hint = t('settings.sessions.CODE_HINT', { email });
	let sendLabel = t('settings.sessions.SEND_CODE');
	if (isCodeSent) {
		hint = t('settings.sessions.CODE_SENT', { email });
		sendLabel = t('settings.sessions.SEND_CODE_AGAIN');
	}
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-xs text-pretty text-muted-foreground">{hint}</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isSendingCode}
				onClick={onSendCode}
				className="self-start"
			>
				{isSendingCode && <Spinner className="size-3.5 animate-spin" />}
				{sendLabel}
			</Button>
			<label htmlFor={fieldId} className="mt-1 text-xs text-muted-foreground">
				{t('settings.sessions.CODE_LABEL')}
			</label>
			<Input
				id={fieldId}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				autoComplete="one-time-code"
				spellCheck={false}
				aria-invalid={Boolean(errorId)}
				aria-describedby={errorId}
				className="h-8"
			/>
		</div>
	);
}

/**
 * Confirms "Sign out other sessions": the person proves it is them with the account's password, or for an account
 * without one with the code of the sign-in code e-mail. Gauzy tells which of the two the account needs when the other
 * is sent, and the dialog then asks for that one. A wrong proof signs nobody out.
 */
export function SignOutOthersDialog({
	open,
	count,
	email,
	onClose,
	onSignOut,
	onSendCode
}: Readonly<SignOutOthersDialogProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const [proof, setProof] = useState<TSessionProof>('password');
	const [password, setPassword] = useState('');
	const [code, setCode] = useState('');
	/** Why the dialog now asks for the other proof, after Gauzy refused the one sent. */
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [isSendingCode, setIsSendingCode] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		setProof('password');
		setPassword('');
		setCode('');
		setNotice(null);
		setError(null);
		setIsCodeSent(false);
	}

	const isPassword = proof === 'password';
	const errorId = `${fieldId}-error`;
	let fieldErrorId: string | undefined;
	if (error) {
		fieldErrorId = errorId;
	}
	const typedCode = code.trim();
	let hasProof = typedCode.length > 0;
	let input: IUserSessionSignOutOthersInput = { code: typedCode };
	let switchLabel = t('settings.sessions.USE_PASSWORD');
	if (isPassword) {
		hasProof = password.length > 0;
		input = { password };
		switchLabel = t('settings.sessions.USE_CODE');
	}

	const switchTo = (next: TSessionProof, why: string | null) => {
		setProof(next);
		setNotice(why);
		setError(null);
	};

	const sendCode = async () => {
		setError(null);
		setIsSendingCode(true);
		try {
			await onSendCode();
			setIsCodeSent(true);
		} catch (failure) {
			setError(t('settings.sessions.CODE_NOT_SENT', { reason: reasonOf(failure, t) }));
		} finally {
			setIsSendingCode(false);
		}
	};

	const confirm = async () => {
		const cannotConfirm = !hasProof || isPending;
		if (cannotConfirm) {
			return;
		}
		setError(null);
		setIsPending(true);
		try {
			const signedOut = await onSignOut(input);
			toast.success(t('settings.sessions.SIGNED_OUT_OTHERS', { count: signedOut }));
			onClose();
		} catch (failure) {
			const next = nextProofAfter(proof, failure);
			if (next === proof) {
				setError(signOutFailureOf(failure, proof, t));
				return;
			}
			switchTo(next, switchNoticeOf(next, t));
		} finally {
			setIsPending(false);
		}
	};

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void confirm();
	};

	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={onClose}
			title={t('settings.sessions.SIGN_OUT_OTHERS_TITLE', { count })}
			consequences={[
				{ key: 'others', icon: <LogOut />, text: t('settings.sessions.CONSEQUENCE_OTHERS') },
				{ key: 'this', icon: <Shield />, text: t('settings.sessions.CONSEQUENCE_THIS') }
			]}
			confirmLabel={t('settings.sessions.SIGN_OUT_OTHERS_CONFIRM', { count })}
			isPending={isPending}
			confirmDisabled={!hasProof}
			onConfirm={() => void confirm()}
		>
			<form onSubmit={submit} className="flex flex-col gap-2">
				{notice && <p className="text-[13px] text-pretty text-foreground">{notice}</p>}
				{isPassword && (
					<PasswordField fieldId={fieldId} errorId={fieldErrorId} value={password} onChange={setPassword} />
				)}
				{!isPassword && (
					<CodeField
						fieldId={fieldId}
						errorId={fieldErrorId}
						email={email}
						value={code}
						isCodeSent={isCodeSent}
						isSendingCode={isSendingCode}
						onChange={setCode}
						onSendCode={() => void sendCode()}
					/>
				)}
				{error && (
					<p id={errorId} role="alert" className="text-xs text-pretty text-destructive-ink">
						{error}
					</p>
				)}
				<Button
					type="button"
					variant="link"
					size="sm"
					onClick={() => switchTo(otherProofOf(proof), null)}
					className="h-auto self-start px-0 text-xs"
				>
					{switchLabel}
				</Button>
			</form>
		</ConfirmDestructiveDialog>
	);
}
