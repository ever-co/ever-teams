'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { APP_NAME } from '@/core/constants/config/constants';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { Copy, Download, ExternalLink } from '@/core/components/icons';
import { SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL } from '@/core/components/settings/kit/settings-page';
import {
	TWO_FACTOR_CODE_LENGTH,
	authenticatorCodeOf,
	isAuthenticatorCode,
	recoveryCodesFileText,
	secretGroupsOf,
	twoFactorProofOf,
	twoFactorWriteFailureOf
} from '@/core/lib/auth/two-factor';
import type { ITwoFactorEnrollment, ITwoFactorProof } from '@/core/types/interfaces/auth/two-factor';

type Translate = ReturnType<typeof useTranslations>;

/** The sentence a failed change shows under its field. */
export function writeFailureMessageOf(t: Translate, error: unknown): string {
	const failure = twoFactorWriteFailureOf(error);
	if (failure.kind === 'wrong-code') {
		return t('settings.security.WRONG_CODE');
	}
	if (failure.kind === 'too-many') {
		if (failure.minutes === null) {
			return t('settings.security.TOO_MANY_LATER');
		}
		return t('settings.security.TOO_MANY', { minutes: failure.minutes });
	}
	if (failure.kind === 'unavailable') {
		return t('settings.security.UNAVAILABLE_DESCRIPTION');
	}
	if (failure.kind === 'changed') {
		return t('settings.security.CHANGED');
	}
	return t('settings.security.FAILED');
}

async function copyText(text: string, t: Translate) {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(t('settings.security.COPIED'));
	} catch {
		toast.error(t('settings.security.COPY_FAILED'));
	}
}

function downloadText(fileName: string, text: string) {
	const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function FieldError({ id, message }: Readonly<{ id: string; message: string | null }>) {
	if (!message) {
		return null;
	}
	return (
		<p id={id} role="alert" className="text-xs text-pretty text-destructive-ink">
			{message}
		</p>
	);
}

/**
 * The setup: the key for the authenticator app (a link that opens the app on this device, and the key to type), then
 * the first code it shows, which turns two-factor authentication on.
 */
export function SetupPanel({
	enrollment,
	confirming,
	error,
	onConfirm,
	onCancel
}: Readonly<{
	enrollment: ITwoFactorEnrollment;
	confirming: boolean;
	error: string | null;
	onConfirm: (code: string) => void;
	onCancel: () => void;
}>) {
	const t = useTranslations();
	const fieldId = useId();
	const errorId = `${fieldId}-error`;
	const [code, setCode] = useState('');
	const [incomplete, setIncomplete] = useState(false);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isAuthenticatorCode(code)) {
			setIncomplete(true);
			return;
		}
		setIncomplete(false);
		onConfirm(code);
	};

	let message = error;
	if (incomplete) {
		message = t('settings.security.CODE_INCOMPLETE', { length: TWO_FACTOR_CODE_LENGTH });
	}

	return (
		<div className="flex flex-col gap-5 px-4 py-4">
			<ol className="flex flex-col gap-5">
				<li className="flex flex-col gap-2">
					<span className={SETTINGS_ROW_LABEL}>{t('settings.security.SETUP_STEP_KEY')}</span>
					<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.security.SETUP_STEP_KEY_TEXT')}</span>
					<div className="flex flex-wrap items-center gap-2">
						<code
							aria-label={t('settings.security.SETUP_KEY_LABEL')}
							className="rounded-lg bg-foreground/[0.05] px-3 py-1.5 font-mono text-[13px] tracking-wider break-all text-foreground"
						>
							{secretGroupsOf(enrollment.secret)}
						</code>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => void copyText(enrollment.secret, t)}
						>
							<Copy />
							{t('settings.security.COPY_KEY')}
						</Button>
						<Button asChild size="sm" variant="ghost">
							<a href={enrollment.otpauthUrl}>
								<ExternalLink />
								{t('settings.security.OPEN_IN_APP')}
							</a>
						</Button>
					</div>
				</li>
				<li className="flex flex-col gap-2">
					<label htmlFor={fieldId} className={SETTINGS_ROW_LABEL}>
						{t('settings.security.SETUP_STEP_CODE', { length: TWO_FACTOR_CODE_LENGTH })}
					</label>
					<form className="flex flex-wrap items-start gap-2" onSubmit={submit} noValidate>
						<Input
							id={fieldId}
							value={code}
							onChange={(event) => {
								setCode(authenticatorCodeOf(event.target.value));
								setIncomplete(false);
							}}
							inputMode="numeric"
							autoComplete="one-time-code"
							placeholder="000000"
							aria-invalid={Boolean(message)}
							aria-describedby={message ? errorId : undefined}
							className="w-36 font-mono tracking-[0.3em]"
							aria-required="true"
							autoFocus
						/>
						<Button type="submit" disabled={confirming}>
							{t('settings.security.TURN_ON')}
						</Button>
						<Button type="button" variant="ghost" onClick={onCancel} disabled={confirming}>
							{t('settings.security.CANCEL')}
						</Button>
					</form>
					<FieldError id={errorId} message={message} />
				</li>
			</ol>
		</div>
	);
}

/** The recovery codes, shown once: to copy or download before leaving the page. */
export function RecoveryCodesPanel({ codes, onDone }: Readonly<{ codes: string[]; onDone: () => void }>) {
	const t = useTranslations();
	const fileText = recoveryCodesFileText({
		codes,
		heading: t('settings.security.CODES_FILE_HEADING', { appName: APP_NAME })
	});
	const fileName = `${APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-recovery-codes.txt`;

	return (
		<div className="flex flex-col gap-4 px-4 py-4">
			<div className="flex flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('settings.security.CODES_TITLE')}</span>
				<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.security.CODES_TEXT')}</span>
			</div>
			<ul
				aria-label={t('settings.security.CODES_TITLE')}
				className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-foreground/[0.04] px-4 py-3 font-mono text-[13px] tracking-wider text-foreground sm:grid-cols-2"
			>
				{codes.map((code) => (
					<li key={code}>{code}</li>
				))}
			</ul>
			<div className="flex flex-wrap items-center gap-2">
				<Button type="button" size="sm" variant="outline" onClick={() => void copyText(codes.join('\n'), t)}>
					<Copy />
					{t('settings.security.COPY_CODES')}
				</Button>
				<Button type="button" size="sm" variant="outline" onClick={() => downloadText(fileName, fileText)}>
					<Download />
					{t('settings.security.DOWNLOAD_CODES')}
				</Button>
				<Button type="button" size="sm" className="sm:ml-auto" onClick={onDone}>
					{t('settings.security.CODES_DONE')}
				</Button>
			</div>
		</div>
	);
}

/** A change that has to be proven: a current code of the app, or a recovery code. */
export function ProofForm({
	label,
	confirmLabel,
	destructive = false,
	busy,
	error,
	onConfirm,
	onCancel
}: Readonly<{
	label: string;
	confirmLabel: string;
	destructive?: boolean;
	busy: boolean;
	error: string | null;
	onConfirm: (proof: ITwoFactorProof) => void;
	onCancel: () => void;
}>) {
	const t = useTranslations();
	const fieldId = useId();
	const errorId = `${fieldId}-error`;
	const [value, setValue] = useState('');
	const [incomplete, setIncomplete] = useState(false);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const proof = twoFactorProofOf(value);
		if (!proof) {
			setIncomplete(true);
			return;
		}
		setIncomplete(false);
		onConfirm(proof);
	};

	let message = error;
	if (incomplete) {
		message = t('settings.security.PROOF_INCOMPLETE');
	}

	return (
		<form className="flex flex-col gap-2 px-4 py-4" onSubmit={submit} noValidate>
			<label htmlFor={fieldId} className={SETTINGS_ROW_LABEL}>
				{label}
			</label>
			<span className={SETTINGS_ROW_DESCRIPTION}>{t('settings.security.PROOF_HINT')}</span>
			<div className="flex flex-wrap items-start gap-2">
				<Input
					id={fieldId}
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
						setIncomplete(false);
					}}
					autoComplete="one-time-code"
					spellCheck={false}
					placeholder={t('settings.security.PROOF_PLACEHOLDER')}
					aria-invalid={Boolean(message)}
					aria-describedby={message ? errorId : undefined}
					className="w-48 font-mono tracking-wider"
					aria-required="true"
					autoFocus
				/>
				<Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={busy}>
					{confirmLabel}
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
					{t('settings.security.CANCEL')}
				</Button>
			</div>
			<FieldError id={errorId} message={message} />
		</form>
	);
}
